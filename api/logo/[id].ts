import type { VercelRequest, VercelResponse } from '@vercel/node'
import { manifestExpired, driveGetStream } from '../_drive.js'
import { r2PresignedUrl, r2Config } from '../_r2.js'
import { loadSessionManifest } from '../_store.js'

// Logo d'un événement pour les emails envoyés aux invités. Adresse stable (les
// emails restent lisibles des jours plus tard), résolue à chaque ouverture.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token } = req.query
  if (!id || !token) return res.status(400).json({ error: 'Missing params' })

  try {
    const found = await loadSessionManifest(String(id))
    if (!found) return res.status(404).end()
    const { manifest } = found
    if (manifest.token !== String(token)) return res.status(403).end()
    if (manifestExpired(manifest)) return res.status(410).end()

    if (manifest.logoKey && r2Config()) {
      const url = await r2PresignedUrl(manifest.logoKey)
      if (url) {
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return res.redirect(302, url)
      }
    }
    if (manifest.logoDriveId) {
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return (await driveGetStream(manifest.logoDriveId)).pipe(res)
    }
    return res.status(404).end()
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}
