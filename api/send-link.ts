import type { VercelRequest, VercelResponse } from '@vercel/node'

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

  const apiKey = process.env.RESEND_API_KEY
  const smtpHost = process.env.SMTP_HOST
  if (!apiKey && !smtpHost) {
    return res.status(503).json({
      error: 'Email non configuré. Ajoutez RESEND_API_KEY ou SMTP_HOST dans les variables d\'environnement.'
    })
  }

  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'PhotoCall <noreply@resend.dev>'

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
      // SMTP classique (autohébergé ou n'importe quel fournisseur : OVH, Gmail, Brevo…)
      const { default: nodemailer } = await import('nodemailer')
      const port = Number(process.env.SMTP_PORT ?? 587)
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      })
      await transport.sendMail({ from, to, subject, html, text })
    }
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
