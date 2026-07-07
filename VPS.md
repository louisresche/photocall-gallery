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

## Serveur avec des services déjà en place (ports 80/443 occupés)

Si un reverse proxy (Nginx, Apache, Caddy, Traefik, Nginx Proxy Manager…) écoute déjà sur 80/443, ne lancez **pas** Caddy : démarrez la galerie seule, exposée en local sur le port 3000 :

```bash
docker compose -f docker-compose.proxy.yml up -d --build
```

Puis ajoutez la route dans votre proxy existant (c'est lui qui gère le HTTPS) :

**Nginx :**
```nginx
server {
    server_name galerie.mondomaine.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```
puis `certbot --nginx -d galerie.mondomaine.com`

**Caddy existant :** `galerie.mondomaine.com { reverse_proxy 127.0.0.1:3000 }`

**Traefik :** utilisez le fichier dédié — la galerie se déclare par labels, Traefik route et gère le certificat, aucun port à publier :

```bash
# identifier le réseau de Traefik et le nom du certresolver :
docker inspect $(docker ps --format '{{.Names}}' | grep -im1 traefik) \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
docker inspect $(docker ps -q) --format '{{json .Config.Labels}}' 2>/dev/null | tr ',' '\n' | grep -m3 certresolver

# puis dans .env :
#   TRAEFIK_NETWORK=<le réseau>  TRAEFIK_CERTRESOLVER=<le resolver>  (TRAEFIK_ENTRYPOINT=websecure par défaut)
docker compose -f docker-compose.traefik.yml up -d --build
```

**Nginx Proxy Manager conteneurisé :** le port est publié sur `127.0.0.1` par défaut ; mettez `GALLERY_BIND=0.0.0.0` dans le `.env` (et pare-feu sur le port 3000) ou raccordez les réseaux Docker.

Variables optionnelles du `.env` : `GALLERY_PORT` (défaut 3000), `GALLERY_BIND` (défaut 127.0.0.1).

> Le script d'installation généré par l'application PhotoCall détecte automatiquement les ports occupés et choisit ce mode tout seul, en affichant le bloc de configuration à copier.

## Pas de reverse proxy, ou pas la main dessus ?

Trois options, de la plus simple à la plus lourde :

1. **Ports internes alternatifs + redirection de box/pare-feu** (serveur à la maison, typiquement) : ce qui compte pour le HTTPS automatique, c'est que les ports **80/443 publics** arrivent à Caddy — pas les ports locaux de la machine. Dans le `.env`, mettez :
   ```env
   HTTP_PORT=8080
   HTTPS_PORT=8443
   ```
   puis, sur la box/le routeur, redirigez le port externe **80 → 8080** et **443 → 8443** vers la machine, et relancez `docker compose up -d`. Caddy obtient son certificat normalement, l'URL reste `https://votre-domaine` sans port. Condition : les 80/443 **publics** ne servent pas déjà un autre site.

2. **Cloudflare Tunnel** (aucun port à ouvrir du tout) : si le domaine est géré par Cloudflare, `cloudflared` établit un tunnel sortant vers la galerie (`docker compose -f docker-compose.proxy.yml up -d`, puis un tunnel vers `http://127.0.0.1:3000`). Gratuit, mais dépend de Cloudflare.

3. **Rester sur Vercel** : si ni les ports publics ni un proxy ne sont accessibles, l'hébergement cloud reste la solution sans friction — c'est exactement son cas d'usage.

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

## Mises à jour

**Automatiques (recommandé)** : à chaque mise à jour du repo, GitHub Actions publie une image précompilée (`ghcr.io/louisresche/photocall-gallery:latest`). La stack par défaut inclut **Watchtower**, qui vérifie chaque jour et met la galerie à jour toute seule — rien à faire.

Avec les fichiers `proxy` ou `traefik`, ajoutez `--profile autoupdate` au `up -d` pour activer Watchtower.

**Serveur avec un Watchtower déjà en place :** aucun conflit — le Watchtower de la galerie est isolé dans son propre scope (`photocall`) : il ne touche que le conteneur de la galerie, ignore vos autres conteneurs et ne supprime pas votre instance existante (comportement multi-instances officiel de Watchtower). Deux cas :
- votre Watchtower surveille *tous* les conteneurs (mode par défaut, sans `--label-enable`) → il mettra aussi la galerie à jour ; inutile d'activer le profil `autoupdate` ;
- votre Watchtower est en `--label-enable` → le label `enable=true` est déjà posé sur la galerie, il la couvrira aussi. Sinon, activez le profil `autoupdate` pour avoir l'instance scopée dédiée.

**Manuelles** :
```bash
cd photocall-gallery
git pull                # récupère les éventuels nouveaux fichiers compose
docker compose pull && docker compose up -d
```

**Compiler depuis les sources** (au lieu de l'image précompilée) : `docker compose up -d --build`.

## Sans Docker (alternative)

```bash
npm install && npm run build
PORT=3000 ADMIN_TOKEN=… GOOGLE_OAUTH_CLIENT_ID=… npm run serve
```

Derrière n'importe quel reverse proxy HTTPS (Caddy, Nginx + certbot).

## Dépannage

**« address already in use » / « port is already allocated » sur 80 ou 443 au démarrage de Caddy** : un autre serveur web occupe les ports. Deux cas :

- Le serveur héberge d'autres services derrière un reverse proxy → utilisez le mode « ports occupés » ci-dessus (`docker compose -f docker-compose.proxy.yml up -d`), après avoir arrêté le Caddy en échec : `docker compose down`.
- C'est juste un Apache/Nginx préinstallé et inutilisé (fréquent chez IONOS, OVH…) → désactivez-le puis relancez :
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
