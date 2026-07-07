import type { VercelRequest, VercelResponse } from '@vercel/node'
import { existsSync, readFileSync } from 'node:fs'

// En autohébergé, la config SMTP poussée par l'app PhotoCall (data/email.json)
// prime sur les variables d'environnement. Sur Vercel, le fichier n'existe pas.
function getEmailOverride(): { smtpHost: string; smtpPort?: number; smtpUser: string; smtpPass: string; smtpFrom?: string } | null {
  try {
    const file = process.env.DATA_DIR ? `${process.env.DATA_DIR}/email.json` : 'data/email.json'
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'))
  } catch { /* fallback env */ }
  return null
}

function cors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { to, galleryUrl, eventName, contactEmail } = req.body as { to: string; galleryUrl: string; eventName: string; contactEmail?: string }
  if (!to || !galleryUrl) return res.status(400).json({ error: 'Missing params' })

  const override = getEmailOverride()
  const apiKey = override ? '' : process.env.RESEND_API_KEY
  const smtpHost = override?.smtpHost || process.env.SMTP_HOST
  const smtpPort = Number(override?.smtpPort || process.env.SMTP_PORT || 587)
  const smtpUser = override?.smtpUser || process.env.SMTP_USER
  const smtpPass = override?.smtpPass || process.env.SMTP_PASS
  if (!apiKey && !smtpHost) {
    return res.status(503).json({
      error: 'Email non configuré. Ajoutez RESEND_API_KEY ou SMTP_HOST dans les variables d\'environnement.'
    })
  }

  const from = override?.smtpFrom || process.env.RESEND_FROM || process.env.SMTP_FROM || 'PhotoCall <noreply@resend.dev>'

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h2 style="margin:0 0 8px;font-size:24px;color:#202124">${eventName}</h2>
      <p style="color:#5f6368;margin:0 0 24px">Vos photos sont prêtes !</p>
      <a href="${galleryUrl}"
         style="display:inline-block;padding:12px 28px;background:#202124;color:white;text-decoration:none;border-radius:24px;font-weight:600;font-size:15px">
        Voir mes photos →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9aa0a6;word-break:break-all">
        Lien : ${galleryUrl}
      </p>
      ${contactEmail ? `<p style="margin:16px 0 0;font-size:12px;color:#9aa0a6">En cas de problème avec vos photos, contactez : <a href="mailto:${contactEmail}" style="color:#5f6368">${contactEmail}</a></p>` : ''}
    </div>`

  const subject = `Vos photos - ${eventName}`
  const text = `${eventName}\n\nVos photos sont prêtes !\n\nVoir mes photos : ${galleryUrl}${contactEmail ? `\n\nEn cas de problème avec vos photos, contactez : ${contactEmail}` : ''}`

  try {
    if (apiKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html, text })
      })
      if (!r.ok) {
        const err = await r.text()
        return res.status(500).json({ error: err })
      }
    } else {
      // SMTP classique (Gmail, OVH, Brevo…), via l'override poussé par l'app ou les variables d'env
      const { default: nodemailer } = await import('nodemailer')
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined
      })
      await transport.sendMail({ from, to, subject, html, text })
    }
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
