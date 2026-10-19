import type { VercelRequest, VercelResponse } from '@vercel/node'
import { manifestExpired } from '../_drive.js'
import { decorate, loadEventManifest } from '../_store.js'

// Manifest d'une galerie d'événement (client, favoris, tag) : R2 d'abord, puis Drive
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, efid } = req.query
  if (!token || !id) return res.status(400).json({ error: 'Missing parameters' })

  try {
    const found = await loadEventManifest(String(id), efid ? String(efid) : undefined)
    res.setHeader('Cache-Control', 'no-store')
    if (!found) return res.status(404).json({ error: 'not-ready' })

    const { manifest } = found
    if (manifest.eventId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })
    return res.status(200).json({ ...(await decorate(manifest)), efid: found.efid, source: found.source })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
