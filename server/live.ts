import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Server } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { r2Config } from '../api/_r2.js'

// Relais temps réel entre les ordinateurs SnapMe d'un même événement (/api/live).
//
// Le serveur ne garde rien et ne voit passer aucune photo ni aucune donnée
// d'invité : seulement des « quelque chose a changé dans tel événement », que
// les ordinateurs abonnés traduisent en relecture de R2. Il tient aussi la
// liste des ordinateurs connectés, pour afficher instantanément qui est en ligne.
//
// Authentification : l'ordinateur signe son identifiant avec la clé secrète R2
// (HMAC). Seuls ceux qui ont le pack de l'événement la connaissent.

interface Client {
  ws: WebSocket
  machineId: string
  events: Set<string>
  alive: boolean
  budget: number      // messages autorisés dans la fenêtre en cours
}

const ID = /^[A-Za-z0-9_-]{4,64}$/
const MAX_EVENTS = 50
const MAX_SKEW_MS = 5 * 60_000

function validSignature(machineId: string, ts: number, sig: string): boolean {
  const secret = r2Config()?.secretAccessKey
  if (!secret || !Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${machineId}|${ts}`).digest('hex'))
  const given = Buffer.from(String(sig))
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function cleanEvents(list: unknown): Set<string> {
  if (!Array.isArray(list)) return new Set()
  return new Set(list.filter((e): e is string => typeof e === 'string' && ID.test(e)).slice(0, MAX_EVENTS))
}

export function attachLive(server: Server): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
  const clients = new Set<Client>()

  const send = (ws: WebSocket, msg: object) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)) }

  // Ordinateurs connectés sur un événement, envoyés à chacun de ses abonnés
  function presence(eventId: string): void {
    const subs = [...clients].filter(c => c.events.has(eventId))
    const machines = [...new Set(subs.map(c => c.machineId))]
    for (const c of subs) send(c.ws, { type: 'presence', eventId, machines })
  }

  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== '/api/live') return socket.destroy()
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws))
  })

  wss.on('connection', (ws: WebSocket) => {
    let client: Client | null = null
    const helloTimer = setTimeout(() => ws.close(4001, 'hello attendu'), 10_000)

    ws.on('message', raw => {
      let msg: any
      try { msg = JSON.parse(String(raw)) } catch { return }

      if (!client) {
        if (msg?.type !== 'hello' || typeof msg.machineId !== 'string' || !ID.test(msg.machineId)) return ws.close(4002, 'hello invalide')
        if (!r2Config()) { send(ws, { type: 'error', error: 'R2 non configuré sur ce serveur' }); return ws.close(4003) }
        if (!validSignature(msg.machineId, Number(msg.ts), msg.sig)) { send(ws, { type: 'error', error: 'signature refusée' }); return ws.close(4004) }
        clearTimeout(helloTimer)
        client = { ws, machineId: msg.machineId, events: cleanEvents(msg.events), alive: true, budget: 60 }
        clients.add(client)
        send(ws, { type: 'ready' })
        for (const e of client.events) presence(e)
        return
      }

      // Garde-fou : un ordinateur ne peut pas inonder les autres
      if (--client.budget < 0) return

      if (msg?.type === 'subscribe') {
        const before = client.events
        client.events = cleanEvents(msg.events)
        for (const e of new Set([...before, ...client.events])) presence(e)
      } else if (msg?.type === 'poke' && typeof msg.eventId === 'string' && client.events.has(msg.eventId)) {
        const what = ['session', 'machine', 'overrides'].includes(msg.what) ? msg.what : 'session'
        const sessionId = typeof msg.sessionId === 'string' && ID.test(msg.sessionId) ? msg.sessionId : undefined
        for (const other of clients) {
          if (other !== client && other.events.has(msg.eventId)) {
            send(other.ws, { type: 'poke', eventId: msg.eventId, what, sessionId, from: client.machineId })
          }
        }
      }
    })

    ws.on('pong', () => { if (client) client.alive = true })
    ws.on('close', () => {
      clearTimeout(helloTimer)
      if (!client) return
      clients.delete(client)
      for (const e of client.events) presence(e)
    })
    ws.on('error', () => ws.terminate())
  })

  // Connexions mortes (ordinateur mis en veille, réseau coupé) : détectées en 30 s,
  // pour que les autres voient vite le poste hors ligne. Le budget de messages se recharge.
  setInterval(() => {
    for (const c of clients) {
      if (!c.alive) { c.ws.terminate(); continue }
      c.alive = false
      c.budget = 60
      c.ws.ping()
    }
  }, 30_000)
}
