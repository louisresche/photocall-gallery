import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveResolveManifestId, manifestExpired } from '../_drive.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, mfid } = req.query
  if (!token || !id) return res.status(400).json({ error: 'Missing parameters' })

  try {
    // mfid optionnel : les QR imprimés hors ligne n'en ont pas — on résout par recherche Drive
    let manifestId = mfid ? String(mfid) : await driveResolveManifestId(String(id))

    let manifest: any = null
    if (manifestId) {
      try {
        manifest = await driveGetJson(manifestId)
      } catch {
        manifest = null
      }
    }

    // mfid périmé (manifest recréé côté app) ou fichier illisible : retomber sur la
    // recherche par dossier Drive — même chemin que l'accès par code du ticket
    if (mfid && (!manifest || manifest.sessionId !== String(id))) {
      const resolved = await driveResolveManifestId(String(id))
      if (resolved && resolved !== manifestId) {
        manifestId = resolved
        try { manifest = await driveGetJson(resolved) } catch { manifest = null }
      }
    }

    if (!manifest) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).json({ error: 'not-ready' })
    }
    if (manifest.sessionId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ...manifest, mfid: manifestId })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
