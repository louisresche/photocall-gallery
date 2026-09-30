import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLang, LangSwitch } from '../lib/i18n'

// Pages légales exigées pour la publication de l'app OAuth Google
// (Branding : liens « Règles de confidentialité » et « Conditions d'utilisation »).
// Bilingues comme le reste de la galerie : la langue suit celle de l'appareil.

interface Section { h: string; p: string }

const CHROME = {
  fr: { back: '← Retour à l\'accueil', updated: 'Dernière mise à jour : septembre 2026' },
  en: { back: '← Back to home', updated: 'Last updated: September 2026' }
}

const PRIVACY: Record<'fr' | 'en', { title: string; intro: string; sections: Section[] }> = {
  fr: {
    title: 'Règles de confidentialité',
    intro: 'SnapMe est une solution de photobooth événementiel : elle simplifie le travail des photographes lors d\'un événement (mariage, soirée, salon…) et permet aux invités de retrouver leurs photos en ligne via un ticket imprimé ou par mail. Cette page décrit quelles données sont traitées et comment.',
    sections: [
      { h: 'Photos des invités', p: 'Les photos prises pendant l\'événement sont stockées localement sur l\'ordinateur de l\'opérateur et téléversées sur l\'espace Google Drive du compte de l\'organisateur de l\'événement. Elles ne sont accessibles en ligne qu\'aux personnes disposant du numéro de galerie et du code d\'accès imprimés sur le ticket. Chaque galerie a une durée de conservation limitée, définie par l\'organisateur : passé ce délai, les photos sont retirées du Drive et le lien devient inactif.' },
      { h: 'Utilisation des données Google (API Google Drive)', p: 'L\'application de l\'opérateur se connecte à l\'API Google Drive uniquement pour : téléverser les photos et miniatures de l\'événement sur le Drive du compte connecté, générer les liens de partage des galeries, et supprimer les photos à l\'expiration. L\'accès Drive est utilisé exclusivement à ces fins. Aucune donnée issue de Google Drive n\'est vendue, transmise à des tiers, ni utilisée à des fins publicitaires ou d\'entraînement de modèles. L\'organisateur peut révoquer cet accès à tout moment depuis les paramètres de sécurité de son compte Google (myaccount.google.com/permissions).' },
      { h: 'Adresses email', p: 'Si un invité communique son adresse email pour recevoir le lien de sa galerie, cette adresse est utilisée uniquement pour l\'envoi de ce lien. Elle n\'est ni revendue, ni utilisée pour de la prospection, ni transmise à des tiers.' },
      { h: 'Cookies et suivi', p: 'Ce site de galerie n\'utilise pas de cookies publicitaires ni d\'outils de suivi. Seules des données techniques strictement nécessaires au fonctionnement (code d\'accès de la galerie en cours, langue choisie) peuvent être conservées dans votre navigateur.' },
      { h: 'Vos droits', p: 'Conformément au RGPD, vous pouvez demander l\'accès, la rectification ou la suppression des photos ou données vous concernant. Pour toute demande, adressez-vous à l\'organisateur de l\'événement qui vous a remis le ticket : il peut retirer une photo ou supprimer une galerie entière à tout moment depuis l\'application.' }
    ]
  },
  en: {
    title: 'Privacy policy',
    intro: 'SnapMe is an event photo booth solution: it streamlines the photographer\'s work during an event (wedding, party, trade show…) and lets guests find their photos online through a printed ticket or by email. This page describes what data is processed, and how.',
    sections: [
      { h: 'Guest photos', p: 'Photos taken during the event are stored locally on the operator\'s computer and uploaded to the Google Drive account of the event organiser. They are only accessible online to people holding the gallery number and access code printed on the ticket. Each gallery has a limited retention period set by the organiser: once it expires, the photos are removed from Drive and the link stops working.' },
      { h: 'Use of Google data (Google Drive API)', p: 'The operator\'s application connects to the Google Drive API solely to: upload the event\'s photos and thumbnails to the connected account\'s Drive, generate gallery sharing links, and delete the photos on expiry. Drive access is used for these purposes only. No data obtained from Google Drive is sold, passed on to third parties, or used for advertising or model training. The organiser can revoke this access at any time from their Google account security settings (myaccount.google.com/permissions).' },
      { h: 'Email addresses', p: 'If a guest provides their email address to receive their gallery link, that address is used only to send that link. It is not sold, used for marketing, or passed on to third parties.' },
      { h: 'Cookies and tracking', p: 'This gallery site uses no advertising cookies and no tracking tools. Only technical data strictly necessary to operate the site (the current gallery access code, the chosen language) may be kept in your browser.' },
      { h: 'Your rights', p: 'Under the GDPR, you may request access to, correction of, or deletion of photos and data concerning you. For any such request, contact the event organiser who gave you the ticket: they can remove an individual photo or delete an entire gallery at any time from the application.' }
    ]
  }
}

const TERMS: Record<'fr' | 'en', { title: string; intro: string; sections: Section[] }> = {
  fr: {
    title: 'Conditions d\'utilisation',
    intro: 'En utilisant SnapMe, vous acceptez les conditions suivantes :',
    sections: [
      { h: 'Objet du service', p: 'Ce site permet aux invités d\'un événement de consulter, télécharger et recevoir par email les photos prises via SnapMe lors de cet événement. L\'accès à une galerie nécessite le numéro et le code d\'accès imprimés sur le ticket remis pendant l\'événement.' },
      { h: 'Accès et durée', p: 'Les galeries sont disponibles pour une durée limitée, définie par l\'organisateur de l\'événement. Passé ce délai, les photos ne sont plus accessibles en ligne. Aucune garantie de disponibilité permanente n\'est donnée : pensez à télécharger vos photos.' },
      { h: 'Usage des photos', p: 'Les photos téléchargées sont destinées à un usage personnel et privé des invités. Le code d\'accès d\'une galerie ne doit pas être diffusé publiquement. Les droits relatifs aux images (droit à l\'image des personnes photographiées notamment) restent régis par la loi française ; toute personne apparaissant sur une photo peut en demander le retrait auprès de l\'organisateur de l\'événement.' },
      { h: 'Responsabilité', p: 'Le service est fourni « en l\'état ». L\'exploitant de SnapMe ne saurait être tenu responsable d\'une indisponibilité temporaire du site, de la perte de photos après la période de conservation annoncée, ou d\'un usage des photos par des tiers à qui un invité aurait communiqué le code d\'accès.' },
      { h: 'Contact', p: 'Pour toute question relative à ces conditions ou aux photos d\'un événement, adressez-vous à l\'organisateur de l\'événement qui vous a remis le ticket.' }
    ]
  },
  en: {
    title: 'Terms of use',
    intro: 'By using SnapMe, you accept the following terms:',
    sections: [
      { h: 'Purpose of the service', p: 'This site lets the guests of an event view, download and receive by email the photos taken with SnapMe during that event. Access to a gallery requires the number and access code printed on the ticket handed out during the event.' },
      { h: 'Access and duration', p: 'Galleries are available for a limited period set by the event organiser. After that, the photos are no longer accessible online. No permanent availability is guaranteed: please download your photos.' },
      { h: 'Use of the photos', p: 'Downloaded photos are intended for the personal, private use of the guests. A gallery access code must not be shared publicly. Rights relating to the images (in particular the image rights of the people photographed) remain governed by French law; anyone appearing in a photo may request its removal from the event organiser.' },
      { h: 'Liability', p: 'The service is provided “as is”. The operator of SnapMe cannot be held liable for a temporary unavailability of the site, for the loss of photos after the stated retention period, or for any use of the photos by third parties to whom a guest disclosed the access code.' },
      { h: 'Contact', p: 'For any question about these terms or about the photos of an event, please contact the event organiser who gave you the ticket.' }
    ]
  }
}

function LegalLayout({ content }: { content: { title: string; intro: string; sections: Section[] } }) {
  const { lang } = useLang()
  const chrome = CHROME[lang]
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <LangSwitch />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <Link to="/" style={{ color: '#5f6368', fontSize: 13, textDecoration: 'none' }}>{chrome.back}</Link>
        <h1 style={{ margin: '18px 0 6px', fontSize: 26, fontWeight: 800, color: '#202124', letterSpacing: -0.5 }}>
          {content.title}
        </h1>
        <p style={{ color: '#bdc1c6', fontSize: 12, margin: '0 0 28px' }}>{chrome.updated}</p>
        <div style={{ color: '#3c4043', fontSize: 14, lineHeight: 1.7 }}>
          <p>{content.intro}</p>
          {content.sections.map((s: Section) => (
            <div key={s.h}>
              <H2>{s.h}</H2>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 17, fontWeight: 700, color: '#202124', margin: '26px 0 8px' }}>{children}</h2>
}

export function PrivacyPage() {
  const { lang } = useLang()
  return <LegalLayout content={PRIVACY[lang]} />
}

export function TermsPage() {
  const { lang } = useLang()
  return <LegalLayout content={TERMS[lang]} />
}
