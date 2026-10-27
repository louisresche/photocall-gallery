import { useState } from 'react'
import type { PhotoManifestItem } from '../types'
import { savePhoto, sharePhoto } from '../lib/savePhoto'
import { useLang } from '../lib/i18n'

interface Props { photos: PhotoManifestItem[]; token: string; mfid: string }

function PhotoLightbox({ photos, index, token, mfid, onClose, onNav, onShare }: {
  photos: PhotoManifestItem[]
  index: number
  token: string
  mfid: string
  onClose: () => void
  onNav: (i: number) => void
  onShare: (p: PhotoManifestItem) => void
}) {
  const { t } = useLang()
  const photo = photos[index]
  const fullUrl = photo.src ?? `/api/photo/${photo.driveFileId}?token=${token}&mfid=${mfid}`
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

      {/* Enregistrement : pellicule du téléphone sur mobile, téléchargement sur ordinateur */}
      <div style={{ position: 'absolute', bottom: 28, display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); void savePhoto(photo.save ?? fullUrl, photo.filename) }}
          style={{ background: 'white', color: '#202124', padding: '10px 24px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onShare(photo) }}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '10px 24px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
        >
          {t('sharePhoto')}
        </button>
      </div>

      {/* Counter */}
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  flex: 1, padding: '7px 0', borderRadius: 18, border: '1px solid #dadce0', background: 'white',
  color: '#202124', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
}

export default function PhotoGrid({ photos, token, mfid }: Props) {
  const { t } = useLang()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const thumbUrl = (p: PhotoManifestItem) => p.thumb ?? `/api/photo/${p.thumbnailDriveId}?token=${token}&mfid=${mfid}`
  const saveUrl = (p: PhotoManifestItem) => p.save ?? p.src ?? `/api/photo/${p.driveFileId}?token=${token}&mfid=${mfid}`

  function notify(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(n => n === text ? '' : n), 6000)
  }

  async function share(p: PhotoManifestItem) {
    try {
      const result = await sharePhoto(saveUrl(p), p.filename)
      if (result === 'downloaded') notify(t('shareOnPhone'))
      else if (result === 'retry') notify(t('shareRetry'))
    } catch {
      notify(t('sendError'))
    }
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 14
      }}>
        {photos.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
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
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={actionBtn} onClick={() => void savePhoto(saveUrl(p), p.filename)}>{t('downloadPhoto')}</button>
              <button type="button" style={actionBtn} onClick={() => void share(p)}>{t('sharePhoto')}</button>
            </div>
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
          onShare={p => void share(p)}
        />
      )}

      {notice && (
        <div role="status" style={{ position: 'fixed', left: 16, right: 16, bottom: 20, zIndex: 1100, margin: '0 auto', maxWidth: 460, background: '#202124', color: 'white', borderRadius: 12, padding: '12px 16px', fontSize: 14, lineHeight: 1.5, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {notice}
        </div>
      )}
    </>
  )
}
