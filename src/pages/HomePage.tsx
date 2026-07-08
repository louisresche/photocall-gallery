import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

// Accueil : les invités tapent le numéro à 6 caractères de leur ticket
export default function HomePage() {
  const [id, setId] = useState('')
  const nav = useNavigate()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (id.length === 6) nav(`/g/${id}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📷</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#202124', letterSpacing: -0.5 }}>
          Retrouvez vos photos
        </h1>
        <p style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Saisissez le numéro à 6 caractères imprimé sur votre ticket.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            value={id}
            onChange={e => setId(e.target.value.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 6))}
            placeholder="A7K9P2"
            autoFocus
            style={{
              border: '1.5px solid #dadce0', borderRadius: 12, padding: '12px 16px',
              fontSize: 24, outline: 'none', width: 170, textAlign: 'center',
              fontFamily: 'monospace', letterSpacing: 6, fontWeight: 700, textTransform: 'uppercase'
            }}
          />
          <button
            type="submit"
            disabled={id.length !== 6}
            style={{
              padding: '12px 26px', borderRadius: 12, border: 'none',
              cursor: id.length === 6 ? 'pointer' : 'default', fontWeight: 700, fontSize: 15,
              background: id.length === 6 ? '#202124' : '#dadce0', color: 'white', transition: 'background 0.15s'
            }}
          >
            Ouvrir →
          </button>
        </form>
        <p style={{ color: '#bdc1c6', fontSize: 12, marginTop: 20 }}>
          Le code d'accès vous sera demandé à l'étape suivante.
        </p>
      </div>
    </div>
  )
}
