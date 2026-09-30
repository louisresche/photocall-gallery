export interface PhotoManifestItem {
  id: string; filename: string; driveFileId: string; thumbnailDriveId: string
  takenAt: string; width: number | null; height: number | null
}
export interface SessionManifest {
  sessionId: string; token: string; eventName: string
  createdAt: string; expiresAt: string; expired: boolean
  photos: PhotoManifestItem[]
  mfid?: string // ID Drive du manifest, résolu côté serveur quand absent de l'URL
  logoDriveId?: string // Logo de l'événement, affiché en tête de galerie et dans les emails
  pendingCount?: number // Photos prises mais pas encore téléversées
  contactEmail?: string
}

export interface EventManifest {
  eventId: string; token: string; eventName: string
  createdAt: string; expiresAt: string; expired: boolean
  sessionCount: number
  photos: PhotoManifestItem[]
  efid?: string        // ID Drive du manifest, résolu côté serveur quand absent de l'URL
  logoDriveId?: string
  pendingCount?: number
  contactEmail?: string
}
