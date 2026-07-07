# Déployer la galerie sur votre propre serveur (VPS)

Alternative à Vercel, sans limite de bande passante imposée ni restriction d'usage commercial. Le même code sert les deux hébergements — choisissez l'un ou l'autre (ou les deux, en changeant simplement l'« URL publique » dans PhotoCall).

## Prérequis

- Un VPS (Hetzner, OVH, Scaleway… ~5 €/mois suffisent largement) avec **Docker** installé
- Un **nom de domaine** (ou sous-domaine, ex. `galerie.mondomaine.com`) dont l'enregistrement DNS `A` pointe vers l'IP du VPS — nécessaire pour le HTTPS automatique

## Installation (~10 minutes)

```bash
# Sur le VPS
git clone https://github.com/louisresche/photocall-gallery.git
cd photocall-gallery
cp .env.example .env
nano .env          # remplir (voir ci-dessous)
docker compose up -d --build
```

C'est tout : Caddy obtient le certificat HTTPS tout seul au premier accès. Vérifiez `https://votre-domaine/api/health` — tous les indicateurs utiles doivent être `true`.

## Remplir le `.env`

| Variable | Valeur |
|---|---|
| `DOMAIN` | votre domaine (ex. `galerie.mondomaine.com`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | dans le fichier `client_secret_….json` téléchargé lors de la configuration de PhotoCall (champs `client_id` / `client_secret`) |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | valeur initiale quelconque, ou vide : l'app la poussera via `ADMIN_TOKEN` |
| `ADMIN_TOKEN` | une valeur aléatoire longue : `openssl rand -hex 32` |
| Emails | `RESEND_API_KEY` **ou** `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (le SMTP de n'importe quelle boîte mail existante fonctionne : OVH, Gmail, Brevo…) |

## Relier PhotoCall

Dans **Options → Galerie en ligne** :

1. **URL publique** : `https://votre-domaine`
2. **Token admin** : la valeur `ADMIN_TOKEN` du `.env`
3. Cliquez **« Synchroniser le token Drive → galerie »**

À chaque reconnexion de Google Drive, l'app renverra automatiquement le nouveau jeton au serveur (stocké dans le volume `./data/`, il survit aux redémarrages et prime sur le `.env`).

## Mise à jour

```bash
cd photocall-gallery
git pull
docker compose up -d --build
```

## Sans Docker (alternative)

```bash
npm install && npm run build
PORT=3000 ADMIN_TOKEN=… GOOGLE_OAUTH_CLIENT_ID=… npm run serve
```

Derrière n'importe quel reverse proxy HTTPS (Caddy, Nginx + certbot).

## Dépannage

**« address already in use » sur le port 80 ou 443 au démarrage de Caddy** : le VPS a un serveur web préinstallé (Apache ou Nginx, fréquent chez IONOS, OVH…). Identifiez-le puis désactivez-le :

```bash
ss -tlnp | grep -E ':80 |:443 '
systemctl disable --now apache2    # ou nginx
docker compose up -d
```

**Le certificat HTTPS ne s'obtient pas** : vérifiez que le DNS du domaine pointe bien vers l'IP du VPS (`dig +short votre-domaine`) et que les ports 80/443 sont ouverts dans le pare-feu du fournisseur.

## Notes

- Le téléchargement ZIP n'a **aucune limite de durée** ici (contre 60 s sur Vercel) — utile pour les grosses galeries.
- N'envoyez pas d'emails depuis un Postfix local : les IP de VPS sont presque toujours blacklistées. Utilisez le SMTP d'un fournisseur (option `SMTP_*`).
- Sauvegarde : seul `./data/` (jeton Drive courant) et `.env` sont à conserver ; les photos, elles, restent sur Google Drive.
