import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Readable } from 'node:stream'
import { driveConfigured, driveGetJson, driveGetStream, driveResolveManifestId, driveResolveEventManifestId } from './_drive.js'
import { r2Config, r2GetJson, r2GetStream, r2PresignedUrl, sessionManifestKey, eventGalleryKey } from './_r2.js'

// Lecture des galeries quel que soit l'hébergement : **Cloudflare R2 d'abord**,
// puis Google Drive (sessions d'avant R2, ou R2 indisponible).
//
// Le serveur calcule lui-même l'adresse de chaque image :
//  - photo sur R2 : lien direct signé vers Cloudflare (aucun détour par ici) ;
//  - photo sur le Drive : /api/file, qui la relaie depuis le Drive ;
//  - enregistrement d'une photo : /api/file sur ce même domaine, car un
//    navigateur ignore « download » vers un autre domaine et le partage iOS
//    doit pouvoir lire le fichier.
// Les liens /api/file sont signés (HMAC) et expirent : ils ne révèlent ni le
// jeton de la galerie ni l'identifiant du manifest.

export type Source = 'r2' | 'drive'

// --- Liens /api/file signés ---

function signingSecret(): string {
  return r2Config()?.secretAccessKey || process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.ADMIN_TOKEN || ''
}

function sign(spec: string, exp: number): string {
  return createHmac('sha256', signingSecret()).update(`${spec}|${exp}`).digest('base64url')
}

const WINDOW_MS = 12 * 3600_000

// spec : « r2:<clé> » ou « drive:<identifiant> »
function fileUrl(spec: string, download?: string): string | null {
  if (!signingSecret()) return null
  // Même fenêtre de 12 h que les liens R2 : adresse stable, donc cachable
  const exp = (Math.floor(Date.now() / WINDOW_MS) + 3) * WINDOW_MS
  const qs = new URLSearchParams({ s: spec, exp: String(exp), sig: sign(spec, exp) })
  if (download) qs.set('dl', download)
  return `/api/file?${qs}`
}

export function verifyFileSignature(spec: string, exp: string, sig: string): boolean {
  const secret = signingSecret()
  const n = Number(exp)
  if (!secret || !Number.isFinite(n) || n < Date.now()) return false
  const expected = Buffer.from(sign(spec, n))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export async function openFile(spec: string): Promise<{ stream: Readable; contentType: string; length: string | null }> {
  if (spec.startsWith('r2:')) return r2GetStream(spec.slice(3))
  if (spec.startsWith('drive:')) {
    return { stream: await driveGetStream(spec.slice(6)), contentType: 'image/jpeg', length: null }
  }
  throw new Error('Source inconnue')
}

// --- Adresses des images d'un manifest ---

interface Item { id: string; filename: string; driveFileId?: string; thumbnailDriveId?: string; key?: string; thumbKey?: string }

async function itemUrls(p: Item): Promise<{ src: string; thumb: string; save: string } | null> {
  if (p.key && r2Config()) {
    const [src, thumb] = await Promise.all([r2PresignedUrl(p.key), r2PresignedUrl(p.thumbKey || p.key)])
    const save = fileUrl(`r2:${p.key}`, p.filename)
    if (src && thumb && save) return { src, thumb, save }
  }
  if (p.driveFileId) {
    const src = fileUrl(`drive:${p.driveFileId}`)
    const thumb = fileUrl(`drive:${p.thumbnailDriveId || p.driveFileId}`)
    const save = fileUrl(`drive:${p.driveFileId}`, p.filename)
    if (src && thumb && save) return { src, thumb, save }
  }
  return null
}

// Ajoute src/thumb/save à chaque photo et logoUrl au manifest. Sans clé de
// signature, le manifest est rendu tel quel : la page construit alors les
// anciennes adresses /api/photo (Drive seulement).
export async function decorate<T extends { photos: Item[]; logoKey?: string; logoDriveId?: string }>(manifest: T): Promise<T & { logoUrl?: string }> {
  if (!signingSecret()) return manifest
  const photos = (await Promise.all(manifest.photos.map(async p => {
    const urls = await itemUrls(p)
    return urls ? { ...p, ...urls } : null
  }))).filter(Boolean)
  const logoUrl = manifest.logoKey && r2Config()
    ? await r2PresignedUrl(manifest.logoKey)
    : manifest.logoDriveId ? fileUrl(`drive:${manifest.logoDriveId}`) : null
  return { ...manifest, photos, ...(logoUrl ? { logoUrl } : {}) } as T & { logoUrl?: string }
}

// --- Manifests ---

function isFormatId(id: string): boolean {
  return /^[A-Za-z0-9]{4,12}$/.test(id)
}

// Manifest d'une session. mfid : identifiant Drive du manifest, présent dans
// les QR des sessions Drive (sinon retrouvé par recherche).
export async function loadSessionManifest(id: string, mfid?: string): Promise<{ manifest: any; source: Source; mfid?: string } | null> {
  if (!isFormatId(id)) return null

  try {
    const fromR2 = await r2GetJson(sessionManifestKey(id))
    if (fromR2?.sessionId === id) return { manifest: fromR2, source: 'r2' }
  } catch (err: any) {
    // R2 en panne : le Drive peut encore répondre (sessions « les deux »)
    console.warn('[r2] lecture du manifest impossible', id, err.message)
  }
  if (!driveConfigured()) return null

  let manifestId = mfid || await driveResolveManifestId(id)
  let manifest: any = null
  if (manifestId) {
    try { manifest = await driveGetJson(manifestId) } catch { manifest = null }
  }
  // mfid périmé (manifest recréé côté app) ou illisible : recherche par dossier Drive
  if (mfid && (!manifest || manifest.sessionId !== id)) {
    const resolved = await driveResolveManifestId(id)
    if (resolved && resolved !== manifestId) {
      manifestId = resolved
      try { manifest = await driveGetJson(resolved) } catch { manifest = null }
    }
  }
  return manifest ? { manifest, source: 'drive', mfid: manifestId ?? undefined } : null
}

// Manifest d'une galerie d'événement (client, favoris, tag)
export async function loadEventManifest(id: string, efid?: string): Promise<{ manifest: any; source: Source; efid?: string } | null> {
  if (!isFormatId(id)) return null

  try {
    const fromR2 = await r2GetJson(eventGalleryKey(id))
    if (fromR2?.eventId === id) return { manifest: fromR2, source: 'r2' }
  } catch (err: any) {
    console.warn('[r2] lecture de la galerie impossible', id, err.message)
  }
  if (!driveConfigured()) return null

  let manifestId = efid || await driveResolveEventManifestId(id)
  let manifest: any = null
  if (manifestId) {
    try { manifest = await driveGetJson(manifestId) } catch { manifest = null }
  }
  // efid absent (ticket imprimé avant le premier envoi) ou périmé (galerie régénérée)
  if (!manifest || manifest.eventId !== id) {
    const resolved = await driveResolveEventManifestId(id)
    if (resolved && resolved !== manifestId) {
      manifestId = resolved
      try { manifest = await driveGetJson(resolved) } catch { manifest = null }
    }
  }
  return manifest ? { manifest, source: 'drive', efid: manifestId ?? undefined } : null
}

// Flux d'une photo pour les archives ZIP : R2 si possible, sinon Drive
export async function photoStream(p: Item): Promise<Readable> {
  if (p.key && r2Config()) return (await r2GetStream(p.key)).stream
  if (p.driveFileId) return driveGetStream(p.driveFileId)
  throw new Error(`Photo ${p.id} introuvable`)
}
