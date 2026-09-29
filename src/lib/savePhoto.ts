// Enregistrement d'une photo depuis la galerie.
//
// Il n'existe aucune API web pour écrire directement dans la pellicule : selon la
// plateforme, un chemin différent y mène.
//
// • iOS : la feuille de partage native propose « Enregistrer l'image », qui range
//   la photo dans la pellicule. Un simple lien de téléchargement, lui, la
//   mettrait dans « Fichiers », où les invités ne la retrouvent pas.
//
// • Android : la feuille de partage ne liste que des applications vers qui
//   partager, sans option d'enregistrement — d'où l'impression que le bouton ne
//   fait rien. Le téléchargement classique, en revanche, dépose la photo dans
//   « Téléchargements », dossier que MediaStore indexe : elle apparaît alors dans
//   l'application Photos (album « Download »), et la notification de
//   téléchargement confirme l'enregistrement à l'invité.
//
// • Ordinateur : téléchargement classique, ce que l'utilisateur attend.

function downloadViaLink(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export async function savePhoto(url: string, filename: string): Promise<void> {
  if (isAndroid() || !canShareFiles()) return downloadViaLink(url, filename)

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
