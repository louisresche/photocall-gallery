import type { PhotoManifestItem } from '../types'
interface Props {
  photo: PhotoManifestItem; fullUrl: string
  onClose: () => void; onPrev: () => void; onNext: () => void
}
export default function PhotoLightbox({ photo, fullUrl, onClose, onPrev, onNext }: Props) {
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000
    }}>
      <button onClick={e=>{e.stopPropagation();onPrev()}} style={{position:'absolute',left:16,fontSize:32,color:'white',background:'none',border:'none',cursor:'pointer'}}>‹</button>
      <img src={fullUrl} alt={photo.filename}
        onClick={e=>e.stopPropagation()}
        style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:4}}
      />
      <button onClick={e=>{e.stopPropagation();onNext()}} style={{position:'absolute',right:16,fontSize:32,color:'white',background:'none',border:'none',cursor:'pointer'}}>›</button>
      <a href={fullUrl} download={photo.filename} onClick={e=>e.stopPropagation()}
        style={{position:'absolute',bottom:24,background:'white',color:'black',padding:'8px 20px',borderRadius:20,textDecoration:'none',fontWeight:'bold'}}>
        Télécharger
      </a>
      <button onClick={onClose} style={{position:'absolute',top:16,right:16,fontSize:24,color:'white',background:'none',border:'none',cursor:'pointer'}}>✕</button>
    </div>
  )
}
