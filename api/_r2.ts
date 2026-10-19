import { existsSync, readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { AwsClient, AwsV4Signer } from 'aws4fetch'

// Accès à Cloudflare R2 (API compatible S3) pour la galerie.
//
// Identifiants : variables d'environnement R2_* (Vercel, .env), ou fichier
// data/r2.json poussé par l'application SnapMe (galerie autohébergée), qui prime.
//
// Organisation des fichiers : identique à src/main/services/r2-keys.ts dans
// l'application. Les deux doivent rester alignés.

export const sessionManifestKey = (sessionId: string) => `sessions/${sessionId}/manifest.json`
export const eventGalleryKey = (galleryId: string) => `galleries/${galleryId}.json`
export const notifyKey = (sessionId: string) => `notify/${sessionId}/${Date.now()}.json`
export const sessionOverridesKey = (sessionId: string) => `sessions/${sessionId}/overrides.json`
export const eventSessionsPrefix = (eventId: string) => `events/${encodeURIComponent(eventId)}/sessions/`
export const eventOverridesPrefix = (eventId: string) => `events/${encodeURIComponent(eventId)}/overrides/`

interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

function readOverride(): Partial<R2Config> | null {
  try {
    const file = process.env.DATA_DIR ? `${process.env.DATA_DIR}/r2.json` : 'data/r2.json'
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'))
  } catch { /* variables d'environnement */ }
  return null
}

export function r2Config(): R2Config | null {
  const o = readOverride()
  const c = {
    accountId: o?.accountId || process.env.R2_ACCOUNT_ID || '',
    accessKeyId: o?.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: o?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: o?.bucket || process.env.R2_BUCKET || ''
  }
  return c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket ? c : null
}

// R2_ENDPOINT : serveur compatible S3 local, pour les tests de bout en bout
function objectUrl(c: R2Config, key: string): string {
  const endpoint = process.env.R2_ENDPOINT || `https://${c.accountId}.r2.cloudflarestorage.com`
  return `${endpoint}/${encodeURIComponent(c.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`
}

let cached: { sig: string; client: AwsClient } | null = null
function client(c: R2Config): AwsClient {
  const sig = `${c.accountId}:${c.accessKeyId}:${c.secretAccessKey}`
  if (cached?.sig !== sig) cached = { sig, client: new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: 's3', region: 'auto' }) }
  return cached.client
}

// null : R2 non configuré ou fichier absent — l'appelant se rabat sur le Drive
export async function r2GetJson(key: string): Promise<any | null> {
  const c = r2Config()
  if (!c) return null
  const res = await client(c).fetch(objectUrl(c, key))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`R2 error ${res.status}`)
  return res.json()
}

export async function r2PutJson(key: string, content: object): Promise<void> {
  const c = r2Config()
  if (!c) throw new Error('R2 non configuré')
  const res = await client(c).fetch(objectUrl(c, key), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content)
  })
  if (!res.ok) throw new Error(`R2 error ${res.status}`)
}

// Clés sous un préfixe (pages de 1 000)
export async function r2List(prefix: string): Promise<string[]> {
  const c = r2Config()
  if (!c) return []
  const base = objectUrl(c, '').replace(/\/$/, '')
  const keys: string[] = []
  let token = ''
  const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  do {
    const qs = new URLSearchParams({ 'list-type': '2', prefix })
    if (token) qs.set('continuation-token', token)
    const res = await client(c).fetch(`${base}?${qs}`)
    if (!res.ok) throw new Error(`R2 error ${res.status}`)
    const xml = await res.text()
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) keys.push(decode(m[1]))
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decode(xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)?.[1] ?? '') : ''
  } while (token)
  return keys
}

// Flux d'octets (archives ZIP, enregistrement d'une photo depuis la galerie)
export async function r2GetStream(key: string): Promise<{ stream: Readable; contentType: string; length: string | null }> {
  const c = r2Config()
  if (!c) throw new Error('R2 non configuré')
  const res = await client(c).fetch(objectUrl(c, key))
  if (!res.ok || !res.body) throw new Error(`R2 error ${res.status}`)
  return {
    stream: Readable.fromWeb(res.body as any),
    contentType: res.headers.get('content-type') || 'image/jpeg',
    length: res.headers.get('content-length')
  }
}

// Fenêtres de 12 h : une même photo garde la même adresse signée pendant la
// fenêtre, ce qui laisse le navigateur la garder en cache d'une visite à l'autre.
const WINDOW_MS = 12 * 3600_000
const EXPIRES_S = 36 * 3600   // toujours au moins 24 h de validité restante

function amzDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[:-]|\.\d{3}/g, '')
}

// Lien direct vers R2, signé : le navigateur télécharge la photo chez
// Cloudflare sans passer par ce serveur
export async function r2PresignedUrl(key: string): Promise<string | null> {
  const c = r2Config()
  if (!c) return null
  const url = new URL(objectUrl(c, key))
  url.searchParams.set('X-Amz-Expires', String(EXPIRES_S))
  const signer = new AwsV4Signer({
    url: url.toString(), method: 'GET',
    accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey,
    service: 's3', region: 'auto', signQuery: true,
    datetime: amzDate(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS)
  })
  return (await signer.sign()).url.toString()
}
