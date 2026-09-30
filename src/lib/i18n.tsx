import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'snapme.lang'

// Langue de l'appareil par défaut ; tout autre choix de l'invité est mémorisé.
// Le français n'est retenu que pour un appareil francophone : l'anglais sert de
// repli international plutôt que d'imposer le français à tout le monde.
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch { /* navigation privée : on retombe sur la langue de l'appareil */ }
  const device = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase()
  return device.startsWith('fr') ? 'fr' : 'en'
}

type Vars = Record<string, string | number>

const STRINGS = {
  fr: {
    loading: 'Chargement de la galerie…',
    accessCodeTitle: 'Code d\'accès',
    accessCodeHelp: 'Saisissez le code imprimé sur votre ticket (ligne « Code : … ») pour ouvrir la galerie {id}.',
    accessCodeHelpEvent: 'Saisissez le code imprimé sur votre ticket pour ouvrir la galerie {id}.',
    open: 'Ouvrir',
    wrongCode: 'Code d\'accès incorrect pour la galerie {id}.',
    retry: 'Réessayer',
    photoCount: '{n} photo{s}',
    sessionCount: '{n} session{s}',
    downloadAll: 'Télécharger toutes vos photos',
    downloadEvent: 'Télécharger toutes les photos de l\'événement',
    sharePlaceholder: 'Partager la galerie par email',
    send: 'Envoyer',
    sending: 'Envoi…',
    sent: '✓ Envoyé',
    sendError: 'Erreur lors de l\'envoi. Réessayez.',
    sentHint: 'Email envoyé — pensez à consulter vos spams.',
    spamHint: 'Pensez à consulter vos spams à réception.',
    comingSoon: 'Les photos arrivent bientôt…',
    autoRefresh: 'Cette page se rafraîchit automatiquement',
    notifyMe: 'Me prévenir',
    emailPlaceholder: 'votre@email.com',
    notifyPrompt: 'Recevez un email dès que vos photos sont en ligne :',
    notifyDone: '✓ C\'est noté ! Vous recevrez un email dès que vos photos seront en ligne.',
    uploadingTitle: 'Bientôt disponible',
    uploadingText: 'Les photos de cet événement sont en cours de transfert. Cette page se met à jour toute seule.',
    uploadingPartial: 'Vos photos arrivent : {n} encore en cours de transfert. Revenez plus tard pour voir l\'album complet.',
    contactLine: 'Une question ? Écrivez-nous à {email}',
    legalPrivacy: 'Confidentialité',
    legalTerms: 'Conditions d\'utilisation',
    retention: 'Galerie accessible pendant {days} jour{s}, les photos seront supprimées de nos serveurs.',
    save: '↓ Enregistrer',
    expiredTitle: 'Les photos ne sont plus disponibles',
    expiredText: 'Le délai de conservation de cette galerie est dépassé : les photos ont été retirées.',
    homeTitle: 'Retrouvez vos photos',
    homeHelp: 'Saisissez le numéro à 6 caractères imprimé sur votre ticket.',
    homeHint: 'Le code d\'accès vous sera demandé à l\'étape suivante.',
    openArrow: 'Ouvrir →',
    preparingTitle: 'Galerie en préparation',
    preparingText: 'Les photos de cet événement ne sont pas encore en ligne. Réessayez dans quelques minutes.',
    noAccessTitle: 'Accès impossible',
    invalidCode: 'Code d\'accès invalide.',
    streamNote: 'Gardez cet onglet ouvert jusqu\'à la fin du téléchargement.'
  },
  en: {
    loading: 'Loading gallery…',
    accessCodeTitle: 'Access code',
    accessCodeHelp: 'Enter the code printed on your ticket (the “Code: …” line) to open gallery {id}.',
    accessCodeHelpEvent: 'Enter the code printed on your ticket to open gallery {id}.',
    open: 'Open',
    wrongCode: 'Wrong access code for gallery {id}.',
    retry: 'Try again',
    photoCount: '{n} photo{s}',
    sessionCount: '{n} session{s}',
    downloadAll: 'Download all of your photos',
    downloadEvent: 'Download all the photos from the event',
    sharePlaceholder: 'Share the gallery via email',
    send: 'Send',
    sending: 'Sending…',
    sent: '✓ Sent',
    sendError: 'Sending failed. Please try again.',
    sentHint: 'Email sent — check your spam folder.',
    spamHint: 'Check your spam folder.',
    comingSoon: 'Photos are on their way…',
    autoRefresh: 'This page refreshes automatically',
    notifyMe: 'Notify me',
    emailPlaceholder: 'your@email.com',
    notifyPrompt: 'Get an email as soon as your photos are online:',
    notifyDone: '✓ Noted! You will get an email as soon as your photos are online.',
    uploadingTitle: 'Available soon',
    uploadingText: 'The photos from this event are still uploading. This page updates on its own.',
    uploadingPartial: 'Your photos are on their way: {n} still uploading. Come back later for the complete album.',
    contactLine: 'A question? Email us at {email}',
    legalPrivacy: 'Privacy',
    legalTerms: 'Terms of use',
    retention: 'Gallery available for {days} day{s}, then the photos will be deleted from our server.',
    save: '↓ Save',
    expiredTitle: 'These photos are no longer available',
    expiredText: 'This gallery has passed its retention period: the photos have been removed.',
    homeTitle: 'Find your photos',
    homeHelp: 'Enter the 6-character number printed on your ticket.',
    homeHint: 'You will be asked for the access code on the next step.',
    openArrow: 'Open →',
    preparingTitle: 'Gallery in preparation',
    preparingText: 'The photos from this event are not online yet. Please try again in a few minutes.',
    noAccessTitle: 'Access denied',
    invalidCode: 'Invalid access code.',
    streamNote: 'Keep this tab open until the download finishes.'
  }
} as const

export type StringKey = keyof typeof STRINGS['fr']

interface LangContext {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: StringKey, vars?: Vars) => string
  locale: string
}

const Ctx = createContext<LangContext | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* sans stockage, le choix ne dure que la visite */ }
  }

  // {n}/{days} remplacent les nombres ; {s} rend le pluriel des deux langues
  function t(key: StringKey, vars?: Vars): string {
    let out: string = STRINGS[lang][key]
    if (vars) {
      // split/join plutôt que replaceAll : la cible TypeScript du projet est antérieure à ES2021
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
      const n = Number(vars.n ?? vars.days)
      out = out.split('{s}').join(Number.isFinite(n) && Math.abs(n) !== 1 ? 's' : '')
    }
    return out
  }

  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  return <Ctx.Provider value={{ lang, setLang, t, locale }}>{children}</Ctx.Provider>
}

export function useLang(): LangContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLang doit être utilisé dans <LangProvider>')
  return ctx
}

// Sélecteur discret, placé en haut à droite des pages de galerie
export function LangSwitch() {
  const { lang, setLang } = useLang()
  const item = (l: Lang) => ({
    border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px',
    fontSize: 12, fontWeight: lang === l ? 700 : 500,
    color: lang === l ? '#202124' : '#bdc1c6', fontFamily: 'inherit'
  } as React.CSSProperties)
  return (
    <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setLang('fr')} style={item('fr')} aria-label="Français">FR</button>
      <span style={{ color: '#e8eaed', fontSize: 12 }}>|</span>
      <button type="button" onClick={() => setLang('en')} style={item('en')} aria-label="English">EN</button>
    </div>
  )
}
