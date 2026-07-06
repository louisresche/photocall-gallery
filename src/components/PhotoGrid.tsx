import { useState } from 'react'
import type { PhotoManifestItem } from '../types'

interface Props { photos: PhotoManifestItem[]; token: string; mfid: string }

function PhotoLightbox({ photos, index, token, mfid, onClose, onNav }: {
  photos: PhotoManifestItem[]
  index: number
  token: string
  mfid: string
  onClose: () => void
  onNav: (i: number) => void
}) {
  const photo = photos[index]
  const fullUrl = `/api/photo/${photo.driveFileId}?token=${token}&mfid=${mfid}`
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 22, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

      {/* Prev */}
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onNav(index - 1) }}
          style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 28, width: 52, height: 52, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      )}

      {/* Image */}
      <img
        src={fullUrl}
        alt={photo.filename}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 4, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      />

      {/* Next */}
      {index < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNav(index + 1) }}
          style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 28, width: 52, height: 52, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      )}

      {/* Download */}
      <a
        href={fullUrl}
        download={photo.filename}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 28, background: 'white', color: '#202124', padding: '10px 28px', borderRadius: 24, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        ↓ Télécharger
      </a>

      {/* Counter */}
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}

export default function PhotoGrid({ photos, token, mfid }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const thumbUrl = (p: PhotoManifestItem) => `/api/photo/${p.thumbnailDriveId}?token=${token}&mfid=${mfid}`

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10
      }}>
        {photos.map((p, i) => (
          <div
            key={p.id}
            onClick={() => setSelectedIdx(i)}
            style={{
              borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
              background: '#e8eaed', aspectRatio: '4/3',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <img
              src={thumbUrl(p)}
              alt={p.filename}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {selectedIdx !== null && (
        <PhotoLightbox
          photos={photos}
          index={selectedIdx}
          token={token}
          mfid={mfid}
          onClose={() => setSelectedIdx(null)}
          onNav={setSelectedIdx}
        />
      )}
    </>
  )
}
