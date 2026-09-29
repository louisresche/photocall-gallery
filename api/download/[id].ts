import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveGetStream, driveResolveManifestId, manifestExpired } from '../_drive.js'
import archiver from 'archiver'

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

    // level 0 : les JPEG sont déjà compressés, recompresser ne gagne rien
    const archive = archiver('zip', { zlib: { level: 0 } })
    archive.pipe(res)

    // Une photo à la fois, en flux : la mémoire ne dépend pas du nombre de photos
    for (const photo of manifest.photos) {
      const stream = await driveGetStream(photo.driveFileId)
      const written = new Promise<void>((resolve) => archive.once('entry', () => resolve()))
      archive.append(stream, { name: photo.filename })
      await written
    }

    await archive.finalize()
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}
