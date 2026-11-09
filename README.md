# SnapMe Gallery

Galerie web de **SnapMe** (anciennement PhotoCall), l'application de borne photo
pour événements. Les invités scannent un QR code et retrouvent leurs photos ici :
visualisation, téléchargement d'une photo ou de toutes (ZIP), partage, envoi du
lien par email. Une galerie par session, et des galeries d'événement (toutes les
sessions, Favoris, par tag).

Les photos restent sur **votre** stockage, Cloudflare R2 et/ou Google Drive.
Cette galerie n'est qu'une passerelle sécurisée (jeton obligatoire dans chaque
lien), hébergée sur **votre** compte Vercel ou **votre** serveur.

## Déployer votre galerie

### Vercel (gratuit)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flouisresche%2Fphotocall-gallery&project-name=photocall-gallery)

1. Cliquez sur le bouton ci-dessus (compte Vercel gratuit requis) et laissez les réglages par défaut.
2. Notez l'URL de production (`https://votre-projet.vercel.app`).
3. Dans l'application SnapMe, assistant de configuration → étape « Galerie » :
   collez l'URL, un [token API Vercel](https://vercel.com/account/settings/tokens)
   et le nom du projet, puis cliquez **« Configurer la galerie automatiquement »**.
   L'app écrit elle-même les variables d'environnement et redéploie.

### Votre serveur (VPS, Docker)

Sans les limites du plan gratuit Vercel (bande passante, usage non commercial,
durée des fonctions), avec HTTPS automatique et le relais temps réel entre les
ordinateurs d'un même événement. Voir **[VPS.md](VPS.md)**.

L'image `ghcr.io/louisresche/photocall-gallery:latest` (amd64 + arm64) est
reconstruite à chaque push sur `main`. Mise à jour immédiate d'un serveur :

```bash
cd ~/photocall-gallery && git pull
docker compose pull && docker compose up -d
```

## Variables d'environnement

Envoyées automatiquement par l'application SnapMe (sur Vercel par le token API,
sur un VPS par `ADMIN_TOKEN`), ou à renseigner à la main :

| Variable | Rôle |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | photos sur Cloudflare R2 (lues en priorité) |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | client OAuth Google (type « Application de bureau ») |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | jeton d'accès au Drive, synchronisé par l'app |
| `ADMIN_TOKEN` | *(VPS)* autorise l'app à pousser le jeton Drive et les clés R2 |
| `RESEND_API_KEY`, `RESEND_FROM` | *(optionnel)* emails via [Resend](https://resend.com) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | *(optionnel, VPS)* emails par SMTP |
| `DOMAIN` | *(VPS avec Caddy)* domaine du certificat HTTPS |

Vérification : `https://votre-galerie/api/health` indique ce qui est configuré
(`hasR2`, `hasRefreshToken`, `hasResendKey`…).

## Développement local

```bash
npm install
vercel dev                      # fonctions serverless + SPA, comme sur Vercel
npm run build && npm run serve  # ou : le serveur autohébergé (Express)
```

## Architecture

- **SPA React + Vite** (`src/`) : galerie de session (`/g/:sessionId?token=…`),
  galerie d'événement (`/e/:eventId?token=…`), grille en colonnes, plein écran,
  téléchargement, partage.
- **Fonctions serverless** (`api/`) : lecture des manifests et des photos sur R2
  (adresses signées) ou sur le Drive (OAuth), ZIP à la volée, emails.
- **Serveur autohébergé** (`server/`) : sert la SPA et monte les mêmes routes
  `api/` avec Express, plus le relais temps réel `/api/live`.
- Aucune base de données : la source de vérité est le `manifest.json` de chaque
  session (et de chaque galerie d'événement), écrit par l'application SnapMe.

Le code est développé dans le dépôt de l'application, puis recopié ici.
