interface Props { sessionId: string; token: string; mfid: string; eventName?: string }
export default function DownloadButton({ sessionId, token, mfid }: Props) {
  return (
    <a
      href={`/api/download/${sessionId}?token=${token}&mfid=${mfid}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 24px', background: '#202124', color: 'white',
        borderRadius: 24, textDecoration: 'none', fontWeight: 600, fontSize: 14
      }}
    >
      ↓ Télécharger toutes les photos
    </a>
  )
}
