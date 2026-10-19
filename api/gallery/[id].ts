import type { VercelRequest, VercelResponse } from '@vercel/node'
import { manifestExpired } from '../_drive.js'
import { decorate, loadSessionManifest } from '../_store.js'

// Manifest d'une session : Cloudflare R2 d'abord, puis Google Drive
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, mfid } = req.query
  if (!token || !id) return res.status(400).json({ error: 'Missing parameters' })

  try {
    // mfid optionnel : absent des QR R2 et des QR Drive imprimés hors ligne
    const found = await loadSessionManifest(String(id), mfid ? String(mfid) : undefined)
    res.setHeader('Cache-Control', 'no-store')
    if (!found) return res.status(404).json({ error: 'not-ready' })

    const { manifest } = found
    if (manifest.sessionId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })
    return res.status(200).json({ ...(await decorate(manifest)), mfid: found.mfid, source: found.source })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
