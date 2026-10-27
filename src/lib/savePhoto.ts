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

// Partage d'une photo vers une application (story Instagram, WhatsApp, Messenger…).
//
// Le web ne peut pas publier directement dans une story : seule la feuille de
// partage du téléphone, qui reçoit le fichier image, propose Instagram (« Story »,
// « Publication », « Message ») et les autres applications installées. Sur
// ordinateur elle n'existe pas : on télécharge la photo et on le dit à l'invité.
//
// Safari exige que la feuille s'ouvre peu après le toucher : si le téléchargement
// de la photo a été trop long, le partage est refusé. La photo reste alors en
// mémoire et le toucher suivant l'ouvre immédiatement.
export type ShareResult = 'shared' | 'cancelled' | 'retry' | 'downloaded'

const ready = new Map<string, File>()

export async function sharePhoto(url: string, filename: string): Promise<ShareResult> {
  if (!canShareFiles()) {
    downloadViaLink(url, filename)
    return 'downloaded'
  }
  let file = ready.get(url)
  if (!file) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    if (ready.size >= 6) ready.clear()
    ready.set(url, file)
  }
  if (!navigator.canShare({ files: [file] })) {
    downloadViaLink(url, filename)
    return 'downloaded'
  }
  try {
    await navigator.share({ files: [file] })
    return 'shared'
  } catch (err) {
    const name = (err as Error)?.name
    if (name === 'AbortError') return 'cancelled'
    if (name === 'NotAllowedError') return 'retry'
    throw err
  }
}
