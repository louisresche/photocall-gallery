// Enregistrement d'une photo depuis la galerie.
//
// Sur mobile, un lien `<a download>` range l'image dans « Fichiers », où les
// invités ne la retrouvent pas. Le partage natif (navigator.share) ouvre la
// feuille de partage du système, qui propose « Enregistrer l'image » / « Ajouter
// aux photos » : la photo atterrit alors dans la pellicule.
//
// Le partage n'est utilisé que sur écran tactile : sur ordinateur, un
// téléchargement classique reste ce que l'utilisateur attend.

function downloadViaLink(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function prefersNativeShare(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export async function savePhoto(url: string, filename: string): Promise<void> {
  if (!prefersNativeShare()) return downloadViaLink(url, filename)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch (err) {
    // L'invité a fermé la feuille de partage : ne rien télécharger derrière son dos
    if ((err as Error)?.name === 'AbortError') return
  }

  downloadViaLink(url, filename)
}
