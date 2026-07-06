async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Variables OAuth manquantes (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }).toString()
  })
  if (!res.ok) throw new Error(`OAuth error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function driveList(query: string, accessToken: string): Promise<{ id: string; name: string }[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { files: { id: string; name: string }[] }
  return data.files ?? []
}

// Retrouve le manifest.json d'une session par le nom de son dossier Drive
// (fallback quand l'URL du QR a été générée hors ligne, sans mfid)
export async function driveResolveManifestId(sessionId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{4,12}$/.test(sessionId)) return null
  const accessToken = await getAccessToken()
  const folders = await driveList(
    `name = '${sessionId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    accessToken
  )
  for (const folder of folders) {
    const files = await driveList(
      `name = 'manifest.json' and '${folder.id}' in parents and trashed = false`,
      accessToken
    )
    if (files[0]) return files[0].id
  }
  return null
}

export async function driveGetJson(fileId: string): Promise<any> {
  const token = await getAccessToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function driveGetBuffer(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = await getAccessToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${await res.text()}`)
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'image/jpeg'
  }
}
