import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveSaveNotifyRequest } from './_drive.js'

// Un invité en attente de ses photos demande à être prévenu par email.
// La demande est stockée sur le Drive ; l'application PhotoCall vérifie le token
// et envoie l'email dès la première photo synchronisée.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionId, token, email } = req.body as { sessionId?: string; token?: string; email?: string }
  if (!sessionId || !token || !email) return res.status(400).json({ error: 'Missing params' })
  if (!/^[A-Za-z0-9]{4,12}$/.test(sessionId)) return res.status(400).json({ error: 'Invalid sessionId' })
  if (!/^[0-9a-f]{8,64}$/.test(token)) return res.status(400).json({ error: 'Invalid token' })
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' })

  try {
    await driveSaveNotifyRequest({ sessionId, token, email, createdAt: new Date().toISOString() }, sessionId)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
