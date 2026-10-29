import { existsSync } from 'node:fs'
import { r2Config } from './_r2.js'

export default (_req: any, res: any) => {
  const emailFile = process.env.DATA_DIR ? `${process.env.DATA_DIR}/email.json` : 'data/email.json'
  res.json({
    ok: true,
    node: process.version,
    hasFetch: typeof fetch !== 'undefined',
    hasClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    hasRefreshToken: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    hasR2: !!r2Config(),
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSmtp: !!process.env.SMTP_HOST || existsSync(emailFile)
  })
}
