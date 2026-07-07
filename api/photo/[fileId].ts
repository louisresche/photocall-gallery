import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveGetBuffer, manifestExpired } from '../_drive.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { fileId, token, mfid } = req.query
  if (!fileId || !token || !mfid) return res.status(400).json({ error: 'Missing params' })

  try {
    const manifest = await driveGetJson(String(mfid))
    if (manifest.token !== String(token)) return res.status(403).json({ error: 'Invalid token' })
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })

    const { buffer, contentType } = await driveGetBuffer(String(fileId))
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Type', contentType)
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
