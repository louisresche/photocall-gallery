import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveGetJson, driveGetStream, driveResolveEventManifestId, manifestExpired } from '../_drive.js'
import archiver from 'archiver'

function slugify(str: string): string {
  return str.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'photos'
}

// Archive d'un événement entier, assemblée **en flux** : chaque photo est tirée du
// Drive puis poussée vers le client sans jamais être gardée en mémoire, et la
// suivante n'est demandée qu'une fois la précédente écrite. Le serveur reste donc
// à quelques mégaoctets d'empreinte, quelle que soit la taille de l'événement.
//
// Les JPEG sont déjà compressés : on les stocke sans recompression (level 0), ce
// qui évite de brûler du CPU pour un gain de taille nul.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, token, efid } = req.query
  if (!id || !token) return res.status(400).json({ error: 'Missing params' })

  try {
    const manifestId = efid ? String(efid) : await driveResolveEventManifestId(String(id))
    if (!manifestId) return res.status(404).json({ error: 'not-ready' })

    const manifest = await driveGetJson(manifestId)
    if (manifest.eventId !== String(id) || manifest.token !== String(token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    if (manifestExpired(manifest)) return res.status(410).json({ error: 'expired' })

    const filename = `${slugify(manifest.eventName)}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = archiver('zip', { zlib: { level: 0 } })
    archive.on('warning', (err) => console.warn('[event-download]', err.message))
    archive.pipe(res)

    // Le client ferme l'onglet ou coupe : inutile de continuer à tirer du Drive
    let aborted = false
    res.on('close', () => { if (!res.writableFinished) { aborted = true; archive.abort() } })

    const used = new Set<string>()
    for (const photo of manifest.photos) {
      if (aborted) return

      // Deux sessions peuvent contenir un fichier de même nom
      let name = photo.filename
      if (used.has(name)) {
        const dot = name.lastIndexOf('.')
        const base = dot > 0 ? name.slice(0, dot) : name
        const ext = dot > 0 ? name.slice(dot) : ''
        let n = 2
        while (used.has(`${base}-${n}${ext}`)) n++
        name = `${base}-${n}${ext}`
      }
      used.add(name)

      const stream = await driveGetStream(photo.driveFileId)
      const written = new Promise<void>((resolve) => archive.once('entry', () => resolve()))
      archive.append(stream, { name })
      await written
    }

    if (!aborted) await archive.finalize()
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
    else res.end()
  }
}
