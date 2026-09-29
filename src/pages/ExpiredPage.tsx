import { useLang, LangSwitch } from '../lib/i18n'

export default function ExpiredPage() {
  const { t } = useLang()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <LangSwitch />
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#202124' }}>
          {t('expiredTitle')}
        </h1>
        <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {t('expiredText')}
        </p>
      </div>
    </div>
  )
}
