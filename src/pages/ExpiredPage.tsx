export default function ExpiredPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#202124' }}>
          Les photos ne sont plus disponibles
        </h1>
        <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Le délai de conservation de cette galerie est dépassé : les photos ont été retirées.
        </p>
      </div>
    </div>
  )
}
