import { useState, type FormEvent } from 'react'

interface Props { sessionId: string; token: string }

// Formulaire « être prévenu par email » affiché tant que les photos ne sont pas en ligne
export default function NotifyForm({ sessionId, token }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setState('sending')
    try {
      const r = await fetch('/api/notify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, token, email })
      })
      setState(r.ok ? 'sent' : 'error')
    } catch { setState('error') }
  }

  if (state === 'sent') return (
    <div style={{ marginTop: 24, fontSize: 14, color: '#137333' }}>
      ✓ C'est noté ! Vous recevrez un email dès que vos photos seront en ligne.
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 10 }}>
        Recevez un email dès que vos photos sont en ligne :
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setState('idle') }}
          placeholder="votre@email.com"
          required
          style={{ border: '1.5px solid #dadce0', borderRadius: 24, padding: '10px 18px', fontSize: 14, outline: 'none', minWidth: 220 }}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          style={{ padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: '#202124', color: 'white' }}
        >
          {state === 'sending' ? 'Envoi…' : 'Me prévenir'}
        </button>
      </div>
      {state === 'error' && (
        <div style={{ fontSize: 13, color: '#c5221f', marginTop: 8 }}>Erreur lors de l'envoi. Réessayez.</div>
      )}
    </form>
  )
}
