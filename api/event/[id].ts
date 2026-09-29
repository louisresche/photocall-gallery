import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveResolveEventManifestId, manifestExpired } from '../_drive.js'

// Manifest d'une galerie « client » : toutes les photos d'un événement.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, efid } = req.query
  if (!token || !id) return res.status(400).json({ error: 'Missing parameters' })

  try {
    // efid absent (ticket imprimé avant le premier téléversement) ou périmé
    // (galerie régénérée) : on retrouve le fichier par son nom sur le Drive
    let manifestId = efid ? String(efid) : await driveResolveEventManifestId(String(id))

    let manifest: any = null
    if (manifestId) {
      try { manifest = await driveGetJson(manifestId) } catch { manifest = null }
    }
    if (!manifest || manifest.eventId !== String(id)) {
      const resolved = await driveResolveEventManifestId(String(id))
      if (resolved && resolved !== manifestId) {
        manifestId = resolved
        try { manifest = await driveGetJson(resolved) } catch { manifest = null }
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    if (!manifest) return res.status(404).json({ error: 'not-ready' })
    if (manifest.eventId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })
    return res.status(200).json({ ...manifest, efid: manifestId })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
