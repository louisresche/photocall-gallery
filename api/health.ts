export default (_req: any, res: any) => {
  res.json({
    ok: true,
    node: process.version,
    hasFetch: typeof fetch !== 'undefined',
    hasClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    hasRefreshToken: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    hasResendKey: !!process.env.RESEND_API_KEY
  })
}
