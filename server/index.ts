// Serveur autohébergé (VPS) : sert la SPA compilée et monte les mêmes
// fonctions API que le déploiement Vercel — une seule base de code.
import express from 'express'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const DATA_DIR = process.env.DATA_DIR ?? join(ROOT, 'data')
const TOKEN_FILE = join(DATA_DIR, 'refresh-token')
const PORT = Number(process.env.PORT ?? 3000)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? ''

// Les fichiers Vercel contiennent des crochets ([id].ts) : pathToFileURL les encode proprement
async function loadHandler(relPath: string) {
  const mod = await import(pathToFileURL(join(ROOT, 'api', relPath)).href)
  return mod.default as (req: any, res: any) => Promise<unknown> | unknown
}

// Adapte une fonction Vercel (req.query contient aussi les segments dynamiques) en route Express
function mount(handler: (req: any, res: any) => Promise<unknown> | unknown): express.RequestHandler {
  return async (req, res) => {
    ;(req as any).query = { ...req.query, ...req.params }
    try {
      await handler(req, res)
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: err.message })
    }
  }
}

const [gallery, photo, download, sendLink, notifyRequest, health] = await Promise.all([
  loadHandler('gallery/[id].ts'),
  loadHandler('photo/[fileId].ts'),
  loadHandler('download/[id].ts'),
  loadHandler('send-link.ts'),
  loadHandler('notify-request.ts'),
  loadHandler('health.ts')
])

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))

app.get('/api/gallery/:id', mount(gallery))
app.get('/api/photo/:fileId', mount(photo))
app.get('/api/download/:id', mount(download))
app.post('/api/send-link', mount(sendLink))
app.options('/api/send-link', mount(sendLink))
app.post('/api/notify-request', mount(notifyRequest))
app.options('/api/notify-request', mount(notifyRequest))
app.get('/api/health', mount(health))

// L'app PhotoCall pousse le jeton Drive à chaque reconnexion (équivalent de la synchro Vercel).
// Le jeton vit dans un volume (data/refresh-token) et prime sur la variable d'environnement.
app.post('/api/admin/refresh-token', (req, res) => {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'ADMIN_TOKEN non configuré sur le serveur' })
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Unauthorized' })
  const { refreshToken } = req.body as { refreshToken?: string }
  if (!refreshToken || typeof refreshToken !== 'string') return res.status(400).json({ error: 'refreshToken manquant' })
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(TOKEN_FILE, refreshToken, { mode: 0o600 })
  console.log('[admin] refresh token mis à jour')
  return res.json({ ok: true })
})

// L'app PhotoCall pousse la configuration SMTP (Gmail…) — stockée dans le volume, prime sur le .env
app.post('/api/admin/email', (req, res) => {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'ADMIN_TOKEN non configuré sur le serveur' })
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Unauthorized' })
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = req.body as Record<string, unknown>
  if (!smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ error: 'smtpHost, smtpUser et smtpPass requis' })
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(join(DATA_DIR, 'email.json'), JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom }), { mode: 0o600 })
  console.log('[admin] configuration email mise à jour')
  return res.json({ ok: true })
})

// SPA : fichiers statiques puis fallback sur index.html (routes /g/:sessionId, /expired…)
app.use(express.static(DIST, { maxAge: '1h', index: false }))
app.get('*', (_req, res) => {
  if (!existsSync(join(DIST, 'index.html'))) {
    return res.status(503).send('Interface non compilée — lancez `npm run build`')
  }
  res.sendFile(join(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`PhotoCall gallery en écoute sur le port ${PORT}`)
  if (!ADMIN_TOKEN) console.warn('⚠ ADMIN_TOKEN absent : la synchro du jeton Drive depuis l\'app est désactivée')
})
