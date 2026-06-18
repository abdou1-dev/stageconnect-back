# StageConnect — Backend

API REST de mise en relation **étudiants ↔ entreprises** pour la gestion des stages et emplois au Sénégal.
Mémoire de Licence 3 IDA — UNCHK · 2026

**Frontend** : [stageconnect-front](https://github.com/abdou1-dev/stageconnect-front) (Next.js 16 — [stageconnect-front.vercel.app](https://stageconnect-front.vercel.app))
**Référence complète** (contrat API, schéma de données, conventions) : [`REFERENCES.md`](./REFERENCES.md)

---

## Stack

| Couche | Techno |
|---|---|
| Runtime | Node.js 24 LTS |
| Framework | Express 5.2 (TypeScript, CommonJS) |
| ORM | Prisma 7.8 + driver adapter `@prisma/adapter-pg` |
| Base de données | Neon (PostgreSQL serverless) |
| Auth | JWT (`jsonwebtoken` 9) + `bcrypt` 6 |
| Uploads | Cloudinary SDK v2 + `multer` |
| Sécurité | `helmet` + `cors` + `express-rate-limit` |
| Déploiement | Render |

## Démarrage

```bash
git clone https://github.com/abdou1-dev/stageconnect-back.git
cd stageconnect-back
npm install            # déclenche `prisma generate` (postinstall)

# Variables d'environnement
cp .env.example .env
# puis remplir les valeurs (voir tableau ci-dessous)

npx prisma migrate dev   # appliquer le schéma à la base
npm run dev              # http://localhost:3001
```

> Le frontend attend l'API sur `http://localhost:3001/api`.

### Variables d'environnement (`.env`)

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute du serveur (ex. `3001`) |
| `NODE_ENV` | `development` ou `production` |
| `DATABASE_URL` | URL pooled Neon (runtime, via l'adapter pg) |
| `DIRECT_URL` | URL directe Neon (migrations Prisma CLI) |
| `JWT_SECRET` | Secret de signature des tokens JWT |
| `JWT_EXPIRES_IN` | Durée de validité du token (ex. `7d`) |
| `CLIENT_URL` | Origine autorisée par CORS (URL du front) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary |

> ⚠️ Aucun secret ne doit être commité — tout passe par `.env` (gitignoré). Tenir `.env.example` à jour à chaque nouvelle variable.

## Scripts

```bash
npm run dev          # nodemon + ts-node (port 3001)
npm run build        # prisma generate + tsc → dist/
npm start            # node dist/index.js (production)
npm run typecheck    # tsc --noEmit
npm test             # tests Vitest
npx prisma generate  # régénérer le client Prisma
npx prisma migrate dev --name <nom>   # nouvelle migration
```

## Format de réponse API

Toutes les routes renvoient une enveloppe standard :

```jsonc
// Succès
{ "success": true,  "data": { /* ... */ }, "message": "..." }
// Erreur
{ "success": false, "error": "message lisible", "code": 400 }
```

Les erreurs ne sont jamais construites à la main dans un controller : on lève
`throw new HttpError(code, message)` (`src/lib/errors.ts`), capturé par le
middleware `errorHandler` centralisé.

## Authentification

- `POST /api/auth/login` renvoie le token **dans le body** : `{ data: { user, token } }`
- Le client le renvoie via le header `Authorization: Bearer <token>`
- Payload signé : `{ userId, role }`, vérifié par `requireAuth`
- Restriction par rôle : `requireRole('COMPANY', 'ADMIN')` après `requireAuth`

## Routes (montées sous `/api`)

| Domaine | Préfixe | Description |
|---|---|---|
| Auth | `/auth` | inscription, connexion |
| Étudiants | `/students` | profils étudiants |
| Entreprises | `/companies` | profils entreprises |
| Offres | `/jobs` | offres de stage / emploi |
| Candidatures | `/applications` | candidatures aux offres |
| Messages | `/messages` | messagerie étudiant ↔ entreprise |
| Upload | `/upload` | upload de fichiers (Cloudinary) |
| Admin | `/admin` | tableau de bord administrateur |

## Structure

```
src/
  routes/         → un Router par domaine (auth, students, companies, jobs…)
  controllers/    → un fichier par route, fonctions async
  middlewares/    → auth, role, validate, error (centralisé + notFound)
  lib/prisma.ts   → singleton PrismaClient (adapter pg)
  lib/errors.ts   → classe HttpError
  generated/      → client Prisma (généré, gitignoré — ne pas éditer)
  index.ts        → app Express, montage des routes sous /api/*
prisma/schema.prisma
prisma.config.ts
```

## Spécificités Prisma 7

- Générateur `provider = "prisma-client"` → client dans `src/generated/prisma/` (gitignoré, régénéré au `postinstall`/`build`)
- Import : `import { PrismaClient } from '../generated/prisma/client'` (suffixe `/client` obligatoire)
- L'URL de connexion n'est plus dans `schema.prisma` : le CLI lit `prisma.config.ts` (`DIRECT_URL`), le runtime lit `DATABASE_URL` via l'adapter pg dans `src/lib/prisma.ts`

## Conventions

- Branches : `feature/xxx` / `fix/xxx` depuis `develop` → PR (push direct bloqué sur `main` et `develop`)
- Commits : `feat(scope): description` (Conventional Commits)
- `main` = production uniquement — release par PR `develop → main` avec review
- Code en anglais, commentaires en français, pas de `any`
- Express 5 : les handlers async qui rejettent sont attrapés automatiquement → on `throw`, pas de try/catch systématique
- Jamais de `new PrismaClient()` ailleurs que dans `src/lib/prisma.ts`
- Ne jamais renvoyer `password` dans une réponse (utiliser `select`/`omit` Prisma)

## Licence

[MIT](./LICENSE) — projet académique réalisé dans le cadre du mémoire de Licence 3 IDA, UNCHK · 2026.
