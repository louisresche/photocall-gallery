import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { useGallery } from '../hooks/useGallery'
import PhotoGrid from '../components/PhotoGrid'
import DownloadButton from '../components/DownloadButton'
import NotifyForm from '../components/NotifyForm'
import { useEffect, useState, type FormEvent } from 'react'
import { useLang, LangSwitch } from '../lib/i18n'

export default function GalleryPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const mfidParam = params.get('mfid') ?? ''
  const nav = useNavigate()
  const { t, locale } = useLang()
  const [emailInput, setEmailInput] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSendEmail(e: FormEvent) {
    e.preventDefault()
    if (!emailInput || !manifest) return
    setEmailState('sending')
    try {
      const r = await fetch('/api/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailInput,
          galleryUrl: window.location.href,
          eventName: manifest.eventName,
          // URL absolue : le client mail la charge depuis l'extérieur du site
          logoUrl: manifest.logoDriveId
            ? `${window.location.origin}/api/photo/${manifest.logoDriveId}?token=${token}&mfid=${mfid}`
            : undefined
        })
      })
      setEmailState(r.ok ? 'sent' : 'error')
      if (r.ok) {
        setEmailInput('')
        setTimeout(() => setEmailState('idle'), 8000)
      }
    } catch { setEmailState('error') }
  }

  const { manifest, expired, notReady, error, mfid } = useGallery(sessionId!, token, mfidParam)
  const [codeInput, setCodeInput] = useState('')

  useEffect(() => { if (expired) nav('/expired') }, [expired])

  function submitCode(e: FormEvent) {
    e.preventDefault()
    // Le code du ticket est le token, tapé avec ou sans tirets/espaces.
    // Nouveaux codes : 8 caractères majuscules ; anciens : 16 caractères hexadécimaux minuscules.
    const raw = codeInput.replace(/[^0-9a-z]/gi, '')
    const clean = raw.length > 12 ? raw.toLowerCase() : raw.toUpperCase()
    if (clean) nav(`/g/${sessionId}?token=${clean}${mfidParam ? `&mfid=${mfidParam}` : ''}`)
  }

  // URL tapée à la main (sans token) : demander le code d'accès imprimé sur le ticket
  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <LangSwitch />
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#202124' }}>{t('accessCodeTitle')}</h1>
        <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
          {t('accessCodeHelp', { id: sessionId ?? '' })}
        </p>
        <form onSubmit={submitCode} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            placeholder="A7K9-P2M4"
            autoFocus
            style={{ border: '1.5px solid #dadce0', borderRadius: 24, padding: '10px 18px', fontSize: 15, outline: 'none', width: 220, textAlign: 'center', fontFamily: 'monospace', letterSpacing: 1 }}
          />
          <button type="submit" style={{ padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: '#202124', color: 'white' }}>
            {t('open')}
          </button>
        </form>
      </div>
    </div>
  )

  // Code d'accès incorrect (tapé à la main) : proposer de réessayer
  if (error === 'Erreur 403') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, color: '#5f6368', marginBottom: 20 }}>{t('wrongCode', { id: sessionId ?? '' })}</div>
        <button onClick={() => nav(`/g/${sessionId}`)} style={{ padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: '#202124', color: 'white' }}>
          {t('retry')}
        </button>
      </div>
    </div>
  )

  // Session pas encore synchronisée (créée hors ligne) : les photos arrivent avec la connexion
  if (notReady && !manifest) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <LangSwitch />
      <div style={{ textAlign: 'center', color: '#9aa0a6', padding: '0 1.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>{t('uploadingTitle')}</div>
        <div style={{ fontSize: 14, marginTop: 8, color: '#5f6368', lineHeight: 1.6 }}>{t('uploadingText')}</div>
        <NotifyForm sessionId={sessionId!} token={token} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center', color: '#5f6368' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16 }}>Erreur : {error}</div>
      </div>
    </div>
  )

  if (!manifest) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center', color: '#9aa0a6' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⟳</div>
        <div style={{ fontSize: 14 }}>{t('loading')}</div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const createdAt = new Date(manifest.createdAt).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const daysLeft = Math.ceil((new Date(manifest.expiresAt).getTime() - Date.now()) / 86400000)

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Hero header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8eaed', padding: '2rem 1.5rem 1.5rem', textAlign: 'center' }}>
        <LangSwitch />
        {manifest.logoDriveId && (
          <img
            src={`/api/photo/${manifest.logoDriveId}?token=${token}&mfid=${mfid}`}
            alt=""
            style={{ maxHeight: 72, maxWidth: 220, objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800, color: '#202124', letterSpacing: -0.5 }}>
          {manifest.eventName}
        </h1>
        <div style={{ color: '#9aa0a6', marginTop: 8, fontSize: 14 }}>
          {createdAt} · {t('photoCount', { n: manifest.photos.length })}
        </div>
        {manifest.photos.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <DownloadButton sessionId={sessionId!} token={token} mfid={mfid} eventName={manifest.eventName} />
            </div>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailState('idle') }}
                placeholder={t('sharePlaceholder')}
                required
                style={{ border: '1.5px solid #dadce0', borderRadius: 24, padding: '10px 18px', fontSize: 14, outline: 'none', minWidth: 240 }}
              />
              <button
                type="submit"
                disabled={emailState === 'sending'}
                style={{
                  padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 14,
                  background: emailState === 'sent' ? '#137333' : '#202124',
                  color: 'white', transition: 'background 0.2s'
                }}
              >
                {emailState === 'sending' ? t('sending') : emailState === 'sent' ? t('sent') : t('send')}
              </button>
            </form>
            {emailState === 'error' && (
              <div style={{ fontSize: 13, color: '#c5221f' }}>{t('sendError')}</div>
            )}
            {emailState === 'sent' ? (
              <div style={{ fontSize: 13, color: '#137333' }}>{t('sentHint')}</div>
            ) : (
              <div style={{ fontSize: 11, color: '#bdc1c6' }}>{t('spamHint')}</div>
            )}
          </div>
        )}
      </div>

      {/* Photo grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
        {manifest.photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9aa0a6' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>{t('uploadingTitle')}</div>
            <div style={{ fontSize: 14, marginTop: 8, color: '#5f6368', lineHeight: 1.6 }}>{t('uploadingText')}</div>
            <NotifyForm sessionId={sessionId!} token={token} />
          </div>
        ) : (
          <>
            {!!manifest.pendingCount && manifest.pendingCount > 0 && (
              <div style={{ background: '#fef7e0', border: '1px solid #fdd663', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#5f6368', textAlign: 'center' }}>
                {t('uploadingPartial', { n: manifest.pendingCount })}
              </div>
            )}
            <PhotoGrid photos={manifest.photos} token={token} mfid={mfid} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', color: '#bdc1c6', fontSize: 12 }}>
        {t('retention', { days: daysLeft })}
        {manifest.contactEmail && (
          <div style={{ marginTop: 6 }}>
            {t('contactLine', { email: '' })}
            <a href={`mailto:${manifest.contactEmail}`} style={{ color: '#9aa0a6' }}>{manifest.contactEmail}</a>
          </div>
        )}
      </div>
    </div>
  )
}
