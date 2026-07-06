# PhotoCall Gallery

Galerie web de [PhotoCall](https://github.com/louisresche), l'application de borne photo pour événements. Vos invités scannent un QR code et retrouvent leurs photos ici : visualisation, téléchargement individuel ou ZIP, envoi du lien par email.

Les photos restent sur **votre** Google Drive — cette galerie n'est qu'une passerelle sécurisée (token de session obligatoire) hébergée sur **votre** compte Vercel.

## Déployer votre galerie

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flouisresche%2Fphotocall-gallery&project-name=photocall-gallery)

1. Cliquez sur le bouton ci-dessus (compte Vercel gratuit requis) et laissez les réglages par défaut.
2. Notez l'URL de production (`https://votre-projet.vercel.app`).
3. Dans l'application PhotoCall, assistant de configuration → étape « Galerie » : collez l'URL, un [token API Vercel](https://vercel.com/account/settings/tokens) et le nom du projet, puis cliquez **« Configurer la galerie automatiquement »** — l'app pousse elle-même les variables d'environnement et redéploie. Rien d'autre à faire.

### Déploiement manuel (alternative)

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Variables d'environnement

Configurées automatiquement par l'application PhotoCall (ou manuellement dans le dashboard Vercel) :

| Variable | Rôle |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Client OAuth Google (type « Application de bureau ») |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Secret du client OAuth |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Jeton d'accès au Drive, synchronisé par l'app |
| `RESEND_API_KEY` | *(optionnel)* clé [Resend](https://resend.com) pour l'envoi du lien par email |
| `RESEND_FROM` | *(optionnel)* expéditeur des emails, ex. `PhotoCall <noreply@votredomaine.com>` |

Vérification : `https://votre-projet.vercel.app/api/health` doit afficher tous les indicateurs à `true`.

## Développement local

```bash
npm install
vercel dev
```

## Architecture

- **SPA React + Vite** (`src/`) — page galerie (`/g/:sessionId?token=…`), grille de photos, lightbox, téléchargement
- **Fonctions serverless Vercel** (`api/`) — lecture du manifest et des photos sur Google Drive via OAuth, ZIP à la volée, envoi d'email
- Aucune base de données : la source de vérité est un fichier `manifest.json` par session, écrit sur Drive par l'application PhotoCall
