import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveGetBuffer, driveResolveManifestId, manifestExpired } from '../_drive.js'
import archiver from 'archiver'
import { Readable } from 'stream'

function slugify(str: string): string {
  return str.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'photos'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, mfid } = req.query
  if (!id || !token) return res.status(400).json({ error: 'Missing params' })

  try {
    const manifestId = mfid ? String(mfid) : await driveResolveManifestId(String(id))
    if (!manifestId) return res.status(404).json({ error: 'not-ready' })

    const manifest = await driveGetJson(manifestId)
    if (manifest.sessionId !== String(id) || manifest.token !== String(token)) return res.status(403).json({ error: 'Invalid token' })
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })

    const filename = `${slugify(manifest.eventName)}-${String(id)}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.pipe(res)

    for (const photo of manifest.photos) {
      const { buffer } = await driveGetBuffer(photo.driveFileId)
      archive.append(Readable.from(buffer), { name: photo.filename })
    }

    await archive.finalize()
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}
