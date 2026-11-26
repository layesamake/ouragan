# Ouragan.sn — L'info en live

Site d'actualités sénégalaises : **Next.js 16** (App Router) avec **Payload CMS 3** intégré (administration sur `/admin`).

- Conception **mobile first** : les styles de base visent le téléphone, puis s'enrichissent à 640 px (tablette) et 1024 px (ordinateur, avec colonne latérale).
- Base de données : **PostgreSQL (Supabase)** en production, **SQLite** en local.
- Images : **Supabase Storage** (compatible S3) en production, dossier `media/` en local.

## Contenu (administration)

| Collection | Rôle |
|---|---|
| **Articles** | Titre, surtitre, chapô, image, contenu riche, rubrique, auteur, date, cases « À la une » et « Flash info ». Brouillons et historique des versions. |
| **Rubriques** | Nom, couleur, ordre, affichage dans le menu et sur l'accueil. Par défaut : Politique, Économie, Société, Culture, Sports, Vidéos. |
| **Auteurs** | Nom, fonction, photo, biographie. |
| **Médias** | Images (redimensionnées automatiquement : vignette, carte, grand format). |
| **Utilisateurs** | Comptes de connexion à l'administration. |

## Pages publiques

- `/` : bandeau « En direct » (articles « Flash info »), bloc « À la une », un bloc par rubrique, colonne « Dernières infos ».
- `/rubrique/[slug]` : articles d'une rubrique, paginés.
- `/direct/[slug]` : **mode Live** d'un grand événement (élections, match, Magal…). Les messages apparaissent sans recharger : la page interroge `/direct/[slug]/flux` toutes les 10 s (réponse mise en cache 5 s par Cloudflare, hors `/api`). Un direct « En cours » s'affiche en bandeau rouge en haut de l'accueil et dans le menu. Côté admin : *Directs* → ouvrir le direct → bloc « Publier dans le direct ».
- `/direct` : liste des directs.
- `/article/[slug]` : article complet, partage WhatsApp / Facebook / X, « À lire aussi », données structurées `NewsArticle` pour Google.

## Démarrer en local

Prérequis : Node.js 22+ et pnpm.

```bash
cp .env.example .env      # SQLite par défaut, rien d'autre à installer
pnpm install
pnpm dev                  # les 6 rubriques sont créées automatiquement au premier démarrage
                          # http://localhost:3000 — admin : http://localhost:3000/admin
```

Au premier passage sur `/admin`, Payload demande de créer le compte administrateur.

## Mise en production

### 1. Supabase (base de données + images)

1. Créer un projet sur [supabase.com](https://supabase.com) (région la plus proche : Europe).
2. **Base** : *Project Settings → Database → Connection string → Session pooler* → c'est `DATABASE_URL`.
3. **Images** : *Storage* → créer un bucket **public** nommé `media`, puis *Storage → S3 Connection* → créer une clé d'accès. On obtient `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

### 2. Hostinger (application Node.js)

- Déployer depuis GitHub (dépôt `layesamake/ouragan`, branche `main`) en application **Node.js 22**.
- Commande de build : `pnpm install && pnpm build` — commande de démarrage : `pnpm start`.
- Variables d'environnement : `DATABASE_URL`, `PAYLOAD_SECRET` (longue chaîne aléatoire), `NEXT_PUBLIC_SERVER_URL=https://ouragan.sn`, `S3_BUCKET=media`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Les migrations de la base s'appliquent **automatiquement au démarrage**.
- Au premier démarrage, les 6 rubriques (Politique, Économie, Société, Culture, Sports, Vidéos) sont créées automatiquement si la base est vide.

### 3. Cloudflare (DNS)

Pointer `ouragan.sn` et `www` vers l'adresse fournie par Hostinger pour le site, puis activer le SSL.

### 4. Rédaction IA quotidienne (facultatif)

Chaque jour à **10 h 00 GMT**, GitHub Actions (`.github/workflows/daily-news-cron.yml`) appelle `GET /api/cron/generate-news`. La route lit les derniers articles du Soleil, de l'APS, de Seneweb, de Walf NET, de SeneNews et de PressAfrik (`src/lib/newsSources.ts`), écarte les doublons, les faits divers et la presse people, puis les fait **réécrire par Claude** et les enregistre **en brouillon**, avec la **photo d'origine de l'article**, créditée « Photo : <média> » (choix de la rédaction). À défaut, une photo libre est prise sur Wikimedia Commons (personne ou lieu principal), puis sur Pexels, avec l'auteur et la licence crédités. Le rédacteur relit, change la photo s'il le souhaite et publie depuis `/admin`. Chaque article cite le média d'origine et se termine par un lien « Source ».

- **Hostinger** (variables d'environnement) : `ANTHROPIC_API_KEY`, `CRON_SECRET` (longue chaîne aléatoire), et facultativement `ANTHROPIC_MODEL` (par défaut `claude-haiku-5-5`) et `PEXELS_API_KEY` (clé gratuite sur pexels.com/api, dernier secours pour la photo).
- **GitHub** (*Settings → Secrets and variables → Actions*) : secret `CRON_SECRET`, même valeur que sur Hostinger. Variable facultative `SITE_URL` (par défaut `https://ouragan.sn`).
- Lancer à la main : onglet *Actions* → *Rédaction IA quotidienne* → *Run workflow*, ou :
  `curl -H "Authorization: Bearer $CRON_SECRET" https://ouragan.sn/api/cron/generate-news`
- Au plus 3 articles par média et 12 par passage. Le rapport JSON détaille chaque article (créé, doublon, filtré, trop court, erreur).

## Modifier le schéma (ajouter un champ…)

Après une modification dans `src/collections/`, générer une migration avec une base PostgreSQL :

```bash
DATABASE_URL=postgresql://… pnpm payload migrate:create nom-du-changement
pnpm generate:types
```

## Scripts utiles

| Commande | Effet |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` / `pnpm start` | Build et démarrage en production |
| `pnpm seed` | Recrée les rubriques manquantes |
| `pnpm generate:types` | Régénère `src/payload-types.ts` |
| `pnpm lint` | Vérifie le code |
