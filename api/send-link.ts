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

  const from = override?.smtpFrom || process.env.RESEND_FROM || process.env.SMTP_FROM || 'SnapMe <noreply@resend.dev>'

  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeName = esc(eventName || 'Votre événement')

  const html = `
    <div style="background:#f4f5f7;padding:32px 16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8eaed">
        <div style="background:#202124;padding:30px 32px;text-align:center">
          <div style="font-size:36px;line-height:1">&#128248;</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:10px 0 0;letter-spacing:-0.3px">${safeName}</h1>
        </div>
        <div style="padding:32px;text-align:center">
          <p style="font-size:17px;font-weight:700;color:#202124;margin:0 0 6px">Vos photos sont pr&ecirc;tes !</p>
          <p style="font-size:14px;color:#5f6368;line-height:1.6;margin:0 0 26px">
            Retrouvez toutes les photos de l'&eacute;v&eacute;nement dans votre galerie priv&eacute;e :
            visualisez-les, t&eacute;l&eacute;chargez-les une par une ou toutes d'un coup.
          </p>
          <a href="${galleryUrl}"
             style="display:inline-block;padding:14px 36px;background:#202124;color:#ffffff;text-decoration:none;border-radius:28px;font-weight:700;font-size:15px">
            Voir mes photos &rarr;
          </a>
          <p style="margin:26px 0 0;font-size:11px;color:#9aa0a6;line-height:1.6;word-break:break-all">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${galleryUrl}" style="color:#5f6368">${galleryUrl}</a>
          </p>
        </div>
        <div style="border-top:1px solid #f1f3f4;padding:18px 32px;text-align:center">
          ${contactEmail ? `<p style="margin:0 0 6px;font-size:12px;color:#9aa0a6">Un probl&egrave;me avec vos photos ? Contactez <a href="mailto:${esc(contactEmail)}" style="color:#5f6368">${esc(contactEmail)}</a></p>` : ''}
          <p style="margin:0;font-size:11px;color:#bdc1c6">Envoy&eacute; par SnapMe &middot; la galerie expire automatiquement apr&egrave;s l'&eacute;v&eacute;nement</p>
        </div>
      </div>
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
