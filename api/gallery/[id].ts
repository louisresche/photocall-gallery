import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveResolveManifestId } from '../_drive.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, mfid } = req.query
  if (!token || !id) return res.status(400).json({ error: 'Missing parameters' })

  try {
    // mfid optionnel : les QR imprimés hors ligne n'en ont pas — on résout par recherche Drive
    const manifestId = mfid ? String(mfid) : await driveResolveManifestId(String(id))
    if (!manifestId) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).json({ error: 'not-ready' })
    }

    const manifest = await driveGetJson(manifestId)
    if (manifest.sessionId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifest.expired) return res.status(410).json({ error: 'expired', manifest })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ...manifest, mfid: manifestId })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
