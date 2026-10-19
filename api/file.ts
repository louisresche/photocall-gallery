import type { VercelRequest, VercelResponse } from '@vercel/node'
import { openFile, verifyFileSignature } from './_store.js'

// Fichier d'une galerie par lien signé (calculé par /api/gallery et /api/event) :
// photo du Drive relayée, ou photo R2 à enregistrer depuis ce domaine (dl=nom).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { s, exp, sig, dl } = req.query
  if (!s || !exp || !sig) return res.status(400).json({ error: 'Missing params' })
  if (!verifyFileSignature(String(s), String(exp), String(sig))) return res.status(403).json({ error: 'Invalid or expired link' })

  try {
    const file = await openFile(String(s))
    res.setHeader('Content-Type', file.contentType)
    if (file.length) res.setHeader('Content-Length', file.length)
    if (dl) {
      const name = String(dl).replace(/["\\\r\n]/g, '_')
      res.setHeader('Content-Disposition', `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(String(dl))}`)
    }
    // Le lien change toutes les 12 h et n'est valable que 36 h
    res.setHeader('Cache-Control', 'private, max-age=86400')
    file.stream.on('error', () => res.end())
    file.stream.pipe(res)
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}
