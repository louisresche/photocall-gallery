import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

// Pages légales exigées pour la publication de l'app OAuth Google
// (Branding : liens « Règles de confidentialité » et « Conditions d'utilisation »)

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <Link to="/" style={{ color: '#5f6368', fontSize: 13, textDecoration: 'none' }}>← Retour à l'accueil</Link>
        <h1 style={{ margin: '18px 0 6px', fontSize: 26, fontWeight: 800, color: '#202124', letterSpacing: -0.5 }}>
          {title}
        </h1>
        <p style={{ color: '#bdc1c6', fontSize: 12, margin: '0 0 28px' }}>Dernière mise à jour : septembre 2026</p>
        <div style={{ color: '#3c4043', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  )
}

function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 17, fontWeight: 700, color: '#202124', margin: '26px 0 8px' }}>{children}</h2>
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Règles de confidentialité">
      <p>
        SnapMe est une solution de photobooth événementiel : elle simplifie le travail des
        photographes lors d'un événement (mariage, soirée, salon…) et permet aux invités de
        retrouver leurs photos en ligne via un ticket imprimé ou par mail. Cette page décrit
        quelles données sont traitées et comment.
      </p>

      <H2>Photos des invités</H2>
      <p>
        Les photos prises pendant l'événement sont stockées localement sur l'ordinateur de
        l'opérateur et téléversées sur l'espace Google Drive <strong>du compte de l'organisateur de
        l'événement</strong>. Elles ne sont accessibles en ligne qu'aux personnes disposant du numéro
        de galerie et du code d'accès imprimés sur le ticket. Chaque galerie a une durée de
        conservation limitée, définie par l'organisateur : passé ce délai, les photos sont retirées
        du Drive et le lien devient inactif.
      </p>

      <H2>Utilisation des données Google (API Google Drive)</H2>
      <p>
        L'application de l'opérateur se connecte à l'API Google Drive uniquement pour : téléverser
        les photos et miniatures de l'événement sur le Drive du compte connecté, générer les liens
        de partage des galeries, et supprimer les photos à l'expiration. L'accès Drive est utilisé
        exclusivement à ces fins. Aucune donnée issue de Google Drive n'est vendue, transmise à des
        tiers, ni utilisée à des fins publicitaires ou d'entraînement de modèles. L'organisateur
        peut révoquer cet accès à tout moment depuis les paramètres de sécurité de son compte
        Google (myaccount.google.com/permissions).
      </p>

      <H2>Adresses email</H2>
      <p>
        Si un invité communique son adresse email pour recevoir le lien de sa galerie, cette adresse
        est utilisée uniquement pour l'envoi de ce lien. Elle n'est ni revendue, ni utilisée pour de
        la prospection, ni transmise à des tiers.
      </p>

      <H2>Cookies et suivi</H2>
      <p>
        Ce site de galerie n'utilise pas de cookies publicitaires ni d'outils de suivi. Seules des
        données techniques strictement nécessaires au fonctionnement (code d'accès de la galerie en
        cours) peuvent être conservées dans votre navigateur.
      </p>

      <H2>Vos droits</H2>
      <p>
        Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la suppression des
        photos ou données vous concernant. Pour toute demande, adressez-vous à l'organisateur de
        l'événement qui vous a remis le ticket : il peut retirer une photo ou supprimer une galerie
        entière à tout moment depuis l'application.
      </p>
    </LegalLayout>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Conditions d'utilisation">
      <p>
        En utilisant SnapMe, vous acceptez les conditions suivantes :
      </p>

      <H2>Objet du service</H2>
      <p>
        Ce site permet aux invités d'un événement de consulter, télécharger et recevoir par email
        les photos prises via SnapMe lors de cet événement. L'accès à une galerie
        nécessite le numéro et le code d'accès imprimés sur le ticket remis pendant l'événement.
      </p>

      <H2>Accès et durée</H2>
      <p>
        Les galeries sont disponibles pour une durée limitée, définie par l'organisateur de
        l'événement. Passé ce délai, les photos ne sont plus accessibles en ligne. Aucune garantie
        de disponibilité permanente n'est donnée : pensez à télécharger vos photos.
      </p>

      <H2>Usage des photos</H2>
      <p>
        Les photos téléchargées sont destinées à un usage personnel et privé des invités. Le code
        d'accès d'une galerie ne doit pas être diffusé publiquement. Les droits relatifs aux images
        (droit à l'image des personnes photographiées notamment) restent régis par la loi française ;
        toute personne apparaissant sur une photo peut en demander le retrait auprès de
        l'organisateur de l'événement.
      </p>

      <H2>Responsabilité</H2>
      <p>
        Le service est fourni « en l'état ». L'exploitant de SnapMe ne saurait être tenu
        responsable d'une indisponibilité temporaire du site, de la perte de photos après la période
        de conservation annoncée, ou d'un usage des photos par des tiers à qui un invité aurait
        communiqué le code d'accès.
      </p>

      <H2>Contact</H2>
      <p>
        Pour toute question relative à ces conditions ou aux photos d'un événement, adressez-vous à
        l'organisateur de l'événement qui vous a remis le ticket.
      </p>
    </LegalLayout>
  )
}
