import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveSaveNotifyRequest } from './_drive.js'
import { r2Config, r2GetJson, r2PutJson, sessionManifestKey, notifyKey } from './_r2.js'

// Un invité en attente de ses photos demande à être prévenu par email.
// La demande est stockée sur R2 ou le Drive ; l'application vérifie le token
// et envoie l'email dès la première photo synchronisée.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionId, token, email } = req.body as { sessionId?: string; token?: string; email?: string }
  if (!sessionId || !token || !email) return res.status(400).json({ error: 'Missing params' })
  if (!/^[A-Za-z0-9]{4,12}$/.test(sessionId)) return res.status(400).json({ error: 'Invalid sessionId' })
  if (!/^[0-9A-Za-z]{6,64}$/.test(token)) return res.status(400).json({ error: 'Invalid token' })
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' })

  try {
    const request = { sessionId, token, email, createdAt: new Date().toISOString() }
    // La demande va là où vit la session : l'application la cherche au même endroit
    const onR2 = r2Config() ? (await r2GetJson(sessionManifestKey(sessionId)))?.sessionId === sessionId : false
    if (onR2) await r2PutJson(notifyKey(sessionId), request)
    else await driveSaveNotifyRequest(request, sessionId)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
