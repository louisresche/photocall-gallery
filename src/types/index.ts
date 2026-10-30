export interface PhotoManifestItem {
  id: string; filename: string; driveFileId: string; thumbnailDriveId: string
  takenAt: string; width: number | null; height: number | null
  // Adresses calculées par le serveur (R2 signé ou relais Drive) ; absentes
  // sur un serveur sans clé de signature : la page construit l'adresse Drive
  src?: string; thumb?: string; save?: string
}
export interface SessionManifest {
  sessionId: string; token: string; eventName: string
  createdAt: string; expiresAt: string; expired: boolean
  photos: PhotoManifestItem[]
  mfid?: string // ID Drive du manifest, résolu côté serveur quand absent de l'URL
  logoDriveId?: string // Logo de l'événement, affiché en tête de galerie et dans les emails
  logoKey?: string
  logoUrl?: string     // adresse du logo calculée par le serveur
  pendingCount?: number // Photos prises mais pas encore téléversées
  contactEmail?: string
  // En-tête choisi pour l'événement : nom public, titre et logo masquables
  displayName?: string
  hideTitle?: boolean
  hideLogo?: boolean
}

export interface EventManifest {
  kind?: 'event' | 'favorites' | 'tag'
  tagName?: string
  eventId: string; token: string; eventName: string
  createdAt: string; expiresAt: string; expired: boolean
  sessionCount: number
  photos: PhotoManifestItem[]
  efid?: string        // ID Drive du manifest, résolu côté serveur quand absent de l'URL
  logoDriveId?: string
  logoKey?: string
  logoUrl?: string
  pendingCount?: number
  contactEmail?: string
  // En-tête choisi pour l'événement : nom public, titre et logo masquables
  displayName?: string
  hideTitle?: boolean
  hideLogo?: boolean
}

// Nom de l'événement montré aux invités
export function shownName(m: { eventName: string; displayName?: string }): string {
  return m.displayName || m.eventName
}
