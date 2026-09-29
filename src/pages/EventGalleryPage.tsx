import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import PhotoGrid from '../components/PhotoGrid'
import type { EventManifest } from '../types'
import { useLang, LangSwitch } from '../lib/i18n'

// Galerie « client » : toutes les photos d'un événement, remises à l'organisateur.
// Même mécanique d'accès que les galeries d'invités (code du ticket), mais le
// manifest couvre l'ensemble des sessions.
export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const efidParam = params.get('efid') ?? ''
  const nav = useNavigate()
  const { t, locale } = useLang()

  const [manifest, setManifest] = useState<EventManifest | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [codeInput, setCodeInput] = useState('')

  const efid = efidParam || manifest?.efid || ''

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/event/${eventId}?token=${token}${efid ? `&efid=${efid}` : ''}`)
        if (cancelled) return
        if (res.status === 410) { nav('/expired'); return }
        if (res.status === 404) { setState('notready'); return }
        if (!res.ok) { setError(`Erreur ${res.status}`); setState('error'); return }
        setManifest(await res.json())
        setState('ok')
      } catch (e: any) {
        if (!cancelled) { setError(e.message); setState('error') }
      }
    })()
    return () => { cancelled = true }
  }, [eventId, token, efid])

  function submitCode(e: FormEvent) {
    e.preventDefault()
    const clean = codeInput.replace(/[^0-9a-z]/gi, '').toUpperCase()
    if (clean) nav(`/e/${eventId}?token=${clean}${efidParam ? `&efid=${efidParam}` : ''}`)
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <LangSwitch />
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: 440 }}>{children}</div>
    </div>
  )

  if (!token) return shell(
    <>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#202124' }}>{t('accessCodeTitle')}</h1>
      <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
        {t('accessCodeHelpEvent', { id: eventId ?? '' })}
      </p>
      <form onSubmit={submitCode} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          value={codeInput}
          onChange={e => setCodeInput(e.target.value)}
          placeholder="A7K9-P2M4"
          autoFocus
          style={{ border: '1.5px solid #dadce0', borderRadius: 12, padding: '12px 16px', fontSize: 18, outline: 'none', width: 190, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
        />
        <button type="submit" style={{ padding: '12px 26px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: '#202124', color: 'white' }}>
          {t('openArrow')}
        </button>
      </form>
    </>
  )

  if (state === 'loading') return shell(<div style={{ color: '#9aa0a6' }}>{t('loading')}</div>)
  if (state === 'notready') return shell(
    <>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#202124' }}>{t('preparingTitle')}</h1>
      <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6 }}>
        {t('preparingText')}
      </p>
    </>
  )
  if (state === 'error' || !manifest) return shell(
    <>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#202124' }}>{t('noAccessTitle')}</h1>
      <p style={{ color: '#5f6368', fontSize: 14 }}>{error || t('invalidCode')}</p>
    </>
  )

  const createdAt = new Date(manifest.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const daysLeft = Math.ceil((new Date(manifest.expiresAt).getTime() - Date.now()) / 86400000)

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e8eaed', padding: '2rem 1.5rem 1.5rem', textAlign: 'center' }}>
        <LangSwitch />
        {manifest.logoDriveId && (
          <img
            src={`/api/photo/${manifest.logoDriveId}?token=${token}&mfid=${efid}`}
            alt=""
            style={{ maxHeight: 72, maxWidth: 220, objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800, color: '#202124', letterSpacing: -0.5 }}>
          {manifest.eventName}
        </h1>
        <div style={{ color: '#9aa0a6', marginTop: 8, fontSize: 14 }}>
          {createdAt} · {t('photoCount', { n: manifest.photos.length })} · {t('sessionCount', { n: manifest.sessionCount })}
        </div>

        {manifest.photos.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <a
              href={`/api/event-download/${manifest.eventId}?token=${token}&efid=${efid}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#202124', color: 'white', borderRadius: 24, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
            >
              ↓ {t('downloadEvent')}
            </a>
            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 10, lineHeight: 1.5, maxWidth: 420, margin: '10px auto 0' }}>
              {t('streamNote')}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        <PhotoGrid photos={manifest.photos} token={token} mfid={efid} />
      </div>

      <div style={{ textAlign: 'center', padding: '0 2rem 2rem', color: '#bdc1c6', fontSize: 12 }}>
        {t('retention', { days: daysLeft })}
      </div>
    </div>
  )
}
