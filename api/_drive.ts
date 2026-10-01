import { existsSync, readFileSync } from 'node:fs'
import { Readable } from 'node:stream'

// En autohébergé, le jeton poussé par l'app PhotoCall (data/refresh-token) prime
// sur la variable d'environnement. Sur Vercel, le fichier n'existe pas.
function getRefreshToken(): string | undefined {
  try {
    const file = process.env.DATA_DIR ? `${process.env.DATA_DIR}/refresh-token` : 'data/refresh-token'
    if (existsSync(file)) {
      const token = readFileSync(file, 'utf-8').trim()
      if (token) return token
    }
  } catch { /* fallback env */ }
  return process.env.GOOGLE_OAUTH_REFRESH_TOKEN
}

// Expiration contraignante : le drapeau posé par l'app OU la date dépassée
// (couvre le cas où l'app n'est jamais relancée après le délai de rétention)
export function manifestExpired(manifest: any): boolean {
  if (manifest?.expired) return true
  const t = manifest?.expiresAt ? Date.parse(manifest.expiresAt) : NaN
  return Number.isFinite(t) && Date.now() > t
}

// Un jeton d'accès vaut environ une heure : le redemander à chaque requête
// faisait appeler Google des centaines de fois pendant un afflux d'invités, qui
// finissait par limiter le débit — les scans de QR renvoyaient alors des 500.
let cachedToken: { value: string; expiresAt: number } | null = null

export function invalidateAccessToken(): void { cachedToken = null }

// Relance les échecs passagers de Drive (quota 429, pannes 5xx) avec une attente
// croissante. Un invité qui scanne pendant un pic ne doit pas voir une erreur
// pour une seconde d'encombrement.
async function fetchDrive(url: string, init?: RequestInit, tries = 3): Promise<Response> {
  let last: Response | undefined
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, init)
    if (res.ok || (res.status !== 429 && res.status < 500)) return res
    last = res
    await new Promise(r => setTimeout(r, 250 * 2 ** attempt))
  }
  return last as Response
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = getRefreshToken()

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Variables OAuth manquantes (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)')
  }

  const res = await fetchDrive('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }).toString()
  })
  if (!res.ok) throw new Error(`OAuth error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in?: number }
  // Marge de 5 minutes pour ne jamais présenter un jeton expiré
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) - 300) * 1000 }
  return data.access_token
}

async function driveList(query: string, accessToken: string): Promise<{ id: string; name: string }[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`
  const res = await fetchDrive(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { files: { id: string; name: string }[] }
  return data.files ?? []
}

// Retrouve le manifest.json d'une session par le nom de son dossier Drive
// (fallback quand l'URL du QR a été générée hors ligne, sans mfid)
export async function driveResolveManifestId(sessionId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{4,12}$/.test(sessionId)) return null
  const accessToken = await getAccessToken()
  const folders = await driveList(
    `name = '${sessionId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    accessToken
  )
  for (const folder of folders) {
    const files = await driveList(
      `name = 'manifest.json' and '${folder.id}' in parents and trashed = false`,
      accessToken
    )
    if (files[0]) return files[0].id
  }
  return null
}

const NOTIF_FOLDER = 'photocall-notifications'

// Dépose une demande de notification (JSON) dans le dossier photocall-notifications à la racine du Drive
export async function driveSaveNotifyRequest(content: object, sessionId: string): Promise<void> {
  const accessToken = await getAccessToken()
  const folders = await driveList(
    `name = '${NOTIF_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    accessToken
  )
  let folderId = folders[0]?.id
  if (!folderId) {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: NOTIF_FOLDER, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] })
    })
    if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
    folderId = (await res.json() as { id: string }).id
  }

  const boundary = `photocall${Date.now()}`
  const meta = JSON.stringify({ name: `notif-${sessionId}-${Date.now()}.json`, parents: [folderId], mimeType: 'application/json' })
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n--${boundary}--`
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
}

export async function driveGetJson(fileId: string): Promise<any> {
  const token = await getAccessToken()
  const res = await fetchDrive(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  return res.json()
}

// Flux d'octets sans passer par un Buffer complet : indispensable pour assembler
// une archive de plusieurs gigaoctets sans saturer la mémoire du serveur.
export async function driveGetStream(fileId: string): Promise<Readable> {
  const token = await getAccessToken()
  const res = await fetchDrive(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok || !res.body) throw new Error(`Drive error ${res.status}`)
  return Readable.fromWeb(res.body as any)
}

// Retrouve le manifest d'un événement par le nom de son fichier (event-<code>.json)
export async function driveResolveEventManifestId(eventId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{4,12}$/.test(eventId)) return null
  const accessToken = await getAccessToken()
  const files = await driveList(`name = 'event-${eventId}.json' and trashed = false`, accessToken)
  return files[0]?.id ?? null
}

export async function driveGetBuffer(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = await getAccessToken()
  const res = await fetchDrive(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'image/jpeg'
  }
}
