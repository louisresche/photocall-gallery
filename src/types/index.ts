export interface PhotoManifestItem {
  id: string; filename: string; driveFileId: string; thumbnailDriveId: string
  takenAt: string; width: number | null; height: number | null
}
export interface SessionManifest {
  sessionId: string; token: string; eventName: string
  createdAt: string; expiresAt: string; expired: boolean
  photos: PhotoManifestItem[]
  mfid?: string // ID Drive du manifest, résolu côté serveur quand absent de l'URL
}
