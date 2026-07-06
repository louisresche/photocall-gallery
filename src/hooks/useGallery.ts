import { useState, useEffect } from 'react'
import type { SessionManifest } from '../types'

export function useGallery(sessionId: string, token: string, mfidFromUrl: string) {
  const [manifest, setManifest] = useState<SessionManifest | null>(null)
  const [expired, setExpired] = useState(false)
  const [notReady, setNotReady] = useState(false)
  const [error, setError] = useState('')

  // mfid résolu par l'API quand le QR (imprimé hors ligne) n'en contient pas
  const mfid = mfidFromUrl || manifest?.mfid || ''

  async function fetchManifest() {
    try {
      const res = await fetch(`/api/gallery/${sessionId}?token=${token}${mfid ? `&mfid=${mfid}` : ''}`)
      if (res.status === 410) { setExpired(true); return }
      if (res.status === 404) { setNotReady(true); setError(''); return }
      if (!res.ok) { setError(`Erreur ${res.status}`); return }
      const data: SessionManifest = await res.json()
      setNotReady(false)
      setError('')
      setManifest(data)
    } catch (e: any) { setError(e.message) }
  }

  useEffect(() => {
    fetchManifest()
    const interval = setInterval(fetchManifest, 5000)
    return () => clearInterval(interval)
  }, [sessionId, token, mfid])

  return { manifest, expired, notReady, error, mfid }
}
