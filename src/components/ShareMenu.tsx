import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { IconType } from 'react-icons'
import { FaWhatsapp, FaFacebookMessenger, FaTelegram } from 'react-icons/fa6'
import { LuMail, LuMessageSquare, LuLink, LuCheck, LuShare2, LuEllipsis, LuChevronDown } from 'react-icons/lu'
import { useLang } from '../lib/i18n'

interface Props {
  galleryUrl: string
  eventName: string
  // URL absolue du logo pour l'email (le client mail la charge depuis l'extérieur du site)
  logoUrl?: string
}

const item: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 16px', border: 'none', background: 'white',
  color: '#202124', fontSize: 14, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
}

const icon = 20

function isMobile(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

// Partage du lien de la galerie : email (envoyé par le serveur), messageries,
// copie du lien, ou feuille de partage du téléphone pour toutes les autres applis.
export default function ShareMenu({ galleryUrl, eventName, logoUrl }: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Clic en dehors du menu : on le referme
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const text = t('shareText', { event: eventName })
  const message = `${text} : ${galleryUrl}`
  const enc = encodeURIComponent
  const links: { label: string; href: string; Icon: IconType; color: string; mobileOnly?: boolean }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(message)}`, Icon: FaWhatsapp, color: '#25d366' },
    { label: 'Messenger', href: `fb-messenger://share/?link=${enc(galleryUrl)}`, Icon: FaFacebookMessenger, color: '#0866ff', mobileOnly: true },
    { label: 'Telegram', href: `https://t.me/share/url?url=${enc(galleryUrl)}&text=${enc(text)}`, Icon: FaTelegram, color: '#26a5e4' },
    // « ?& » : seule syntaxe que comprennent à la fois iOS et Android
    { label: t('shareSms'), href: `sms:?&body=${enc(message)}`, Icon: LuMessageSquare, color: '#5f6368', mobileOnly: true }
  ]
  const nativeShare = typeof navigator !== 'undefined' && !!navigator.share && isMobile()

  async function sendEmail(e: FormEvent) {
    e.preventDefault()
    if (!emailInput) return
    setEmailState('sending')
    try {
      const r = await fetch('/api/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailInput, galleryUrl, eventName, logoUrl })
      })
      setEmailState(r.ok ? 'sent' : 'error')
      if (r.ok) {
        setEmailInput('')
        setTimeout(() => setEmailState('idle'), 8000)
      }
    } catch { setEmailState('error') }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(galleryUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* presse-papiers refusé : rien à faire de plus */ }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px 10px 24px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: '#202124', color: 'white', fontFamily: 'inherit' }}
      >
        <LuShare2 size={16} />
        {t('shareGallery')}
        <LuChevronDown size={16} style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', marginTop: 6, zIndex: 50, width: 260, background: 'white', border: '1px solid #e8eaed', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.15)', overflow: 'hidden', textAlign: 'left' }}>
          <button type="button" style={{ ...item, fontWeight: emailOpen ? 700 : 400 }} onClick={() => setEmailOpen(o => !o)}>
            <LuMail size={icon} color="#5f6368" />{t('shareByEmail')}
          </button>
          {emailOpen && (
            <form onSubmit={sendEmail} style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailState('idle') }}
                placeholder={t('sharePlaceholder')}
                required
                autoFocus
                style={{ border: '1.5px solid #dadce0', borderRadius: 18, padding: '8px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                type="submit"
                disabled={emailState === 'sending'}
                style={{ padding: '8px 0', borderRadius: 18, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'white', background: emailState === 'sent' ? '#137333' : '#202124', fontFamily: 'inherit' }}
              >
                {emailState === 'sending' ? t('sending') : emailState === 'sent' ? t('sent') : t('send')}
              </button>
              <div style={{ fontSize: 11, color: emailState === 'error' ? '#c5221f' : emailState === 'sent' ? '#137333' : '#9aa0a6' }}>
                {emailState === 'error' ? t('sendError') : emailState === 'sent' ? t('sentHint') : t('spamHint')}
              </div>
            </form>
          )}
          {links.filter(l => !l.mobileOnly || isMobile()).map(l => (
            <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ ...item, borderTop: '1px solid #f1f3f4' }} onClick={() => setOpen(false)}>
              <l.Icon size={icon} color={l.color} />{l.label}
            </a>
          ))}
          <button type="button" style={{ ...item, borderTop: '1px solid #f1f3f4', color: copied ? '#137333' : '#202124' }} onClick={() => void copyLink()}>
            {copied ? <LuCheck size={icon} color="#137333" /> : <LuLink size={icon} color="#5f6368" />}
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
          {nativeShare && (
            <button
              type="button"
              style={{ ...item, borderTop: '1px solid #f1f3f4' }}
              onClick={() => { setOpen(false); navigator.share({ title: eventName, text, url: galleryUrl }).catch(() => {}) }}
            >
              <LuEllipsis size={icon} color="#5f6368" />{t('moreApps')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
