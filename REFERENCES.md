# REFERENCES — StageConnect Sénégal
> Fichier de référence unique pour Abdoulaye DIAW & Abdallah Moussa DIALLO  
> Mémoire L3 IDA — UNCHK · Deadline : 10 Juillet 2026  
> Mettre à jour ce fichier à chaque décision technique majeure.

---

## 1. Stack & Versions

| Couche | Technologie | Version | Hébergement |
|--------|-------------|---------|-------------|
| Frontend | Next.js (App Router) | 16.2 | Vercel |
| Backend | Node.js + Express | Node 24 LTS / Express 5.2 | Render |
| Base de données | Neon (PostgreSQL serverless) | PostgreSQL 16 | Neon cloud |
| ORM | Prisma | 7.x (driver adapter `@prisma/adapter-pg`) | — |
| Auth | JWT + bcrypt | jsonwebtoken 9 / bcrypt 6 | — |
| Storage fichiers | Cloudinary | SDK v2 | Cloudinary free |
| UI Components | shadcn/ui + Tailwind CSS | Tailwind 4 | — |
| HTTP Client (front) | Axios ou fetch natif | — | — |

---

## 2. Repos GitHub

```
stageconnect-front   →  Next.js 16 (Abdoulaye)
stageconnect-back    →  Express API (Abdallah)
```

### Structure frontend (`stageconnect-front`)
```
stageconnect-front/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── etudiant/
│   │   │   ├── profil/page.tsx
│   │   │   ├── offres/page.tsx
│   │   │   ├── candidatures/page.tsx
│   │   │   └── messages/page.tsx
│   │   ├── entreprise/
│   │   │   ├── profil/page.tsx
│   │   │   ├── mes-offres/page.tsx
│   │   │   ├── candidatures/page.tsx
│   │   │   └── messages/page.tsx
│   │   └── admin/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx              ← landing page publique
├── components/
│   ├── ui/                   ← shadcn/ui auto-généré
│   ├── shared/               ← composants partagés (Navbar, Footer...)
│   ├── etudiant/
│   ├── entreprise/
│   └── admin/
├── lib/
│   ├── api.ts                ← client HTTP centralisé (baseURL + token)
│   ├── auth.ts               ← helpers JWT côté client
│   └── utils.ts
├── hooks/
│   └── useAuth.ts
├── types/
│   └── index.ts              ← types TypeScript partagés
├── .env.local
└── REFERENCES.md             ← ce fichier (copie)
```

### Structure backend (`stageconnect-back`)
```
stageconnect-back/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── students.routes.ts
│   │   ├── companies.routes.ts
│   │   ├── jobs.routes.ts
│   │   ├── applications.routes.ts
│   │   ├── messages.routes.ts
│   │   └── admin.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── students.controller.ts
│   │   ├── companies.controller.ts
│   │   ├── jobs.controller.ts
│   │   ├── applications.controller.ts
│   │   ├── messages.controller.ts
│   │   └── admin.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts    ← vérification JWT
│   │   ├── role.middleware.ts    ← vérification rôle (student/company/admin)
│   │   └── validate.middleware.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── lib/
│   │   └── prisma.ts             ← instance Prisma client singleton
│   └── index.ts                  ← entry point Express
├── .env
└── REFERENCES.md                 ← ce fichier (copie)
```

---

## 3. Conventions Git

### Branches
```
main          ← production uniquement (auto-deploy Vercel/Render)
develop       ← branche d'intégration (toujours stable)
feature/xxx   ← nouvelle fonctionnalité
fix/xxx       ← correction de bug
```

**Règle absolue** : on ne push jamais directement sur `main` ni sur `develop`.  
Tout passe par une branche feature/fix → Pull Request → merge dans `develop`.  
`develop → main` uniquement en fin de phase (release).

### Convention de commits (Conventional Commits)
```
feat: ajouter route POST /jobs
fix: corriger validation email au register
chore: mise à jour dépendances Prisma
docs: mettre à jour REFERENCES.md
style: formater les composants Navbar
refactor: extraire logique auth dans un hook
test: ajouter tests route /applications
```

Format : `type(scope?): message court en minuscules`  
Exemples :
```
feat(auth): ajouter middleware vérification JWT
fix(jobs): corriger filtrage par ville
feat(front/profil): ajouter upload photo Cloudinary
```

### Pull Requests
- Titre = même format que le commit
- Description : ce que ça fait, comment tester, screenshots si UI
- Au moins 1 review avant de merger dans `develop`
- Résoudre les conflits avant de demander une review

---

## 4. Variables d'environnement

### Backend (`.env`)
```env
# Serveur
PORT=3001
NODE_ENV=development

# Base de données Neon
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/stageconnect?sslmode=require"

# JWT
JWT_SECRET=votre_secret_tres_long_et_aleatoire
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Frontend URL (pour CORS)
CLIENT_URL=http://localhost:3000
```

### Frontend (`.env.local`)
```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# En production
# NEXT_PUBLIC_API_URL=https://stageconnect-back.onrender.com/api
```

> ⚠️ Ne jamais commit les fichiers `.env` et `.env.local`. Ils sont dans `.gitignore`.

---

## 5. Contrat API

**Base URL** : `http://localhost:3001/api` (dev) / `https://stageconnect-back.onrender.com/api` (prod)

### Auth
| Méthode | Route | Auth requise | Description |
|---------|-------|-------------|-------------|
| POST | `/auth/register` | Non | Créer un compte (student ou company) |
| POST | `/auth/login` | Non | Connexion → retourne JWT |
| GET | `/auth/me` | Oui | Profil de l'utilisateur connecté |

**Body register :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123",
  "role": "STUDENT",
  "firstName": "Abdoulaye",
  "lastName": "Diaw"
}
```

**Réponse login :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "STUDENT"
  }
}
```

### Étudiants
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/students/:id` | Oui | Profil étudiant |
| PUT | `/students/:id` | Oui (owner) | Modifier profil |
| GET | `/students` | Oui (admin/company) | Liste étudiants |

### Entreprises
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/companies/:id` | Non | Fiche entreprise |
| PUT | `/companies/:id` | Oui (owner) | Modifier fiche |
| GET | `/companies` | Non | Liste entreprises |

### Offres d'emploi
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/jobs` | Non | Liste offres (filtres: type, ville, secteur) |
| GET | `/jobs/:id` | Non | Détail offre |
| POST | `/jobs` | Oui (company) | Créer offre |
| PUT | `/jobs/:id` | Oui (owner) | Modifier offre |
| DELETE | `/jobs/:id` | Oui (owner) | Supprimer offre |

**Query params GET /jobs :**
```
/jobs?type=STAGE&ville=Dakar&secteur=Informatique&page=1&limit=10
```

### Candidatures
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/applications` | Oui (student) | Postuler à une offre |
| GET | `/applications/mine` | Oui (student) | Mes candidatures |
| GET | `/applications/job/:jobId` | Oui (company) | Candidatures reçues pour une offre |
| PUT | `/applications/:id/status` | Oui (company) | Changer statut (PENDING/ACCEPTED/REJECTED) |

### Messages
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/messages/:conversationId` | Oui | Messages d'une conversation |
| POST | `/messages` | Oui | Envoyer un message |
| GET | `/messages/conversations` | Oui | Liste des conversations |

### Admin
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/admin/users` | Oui (admin) | Liste tous les utilisateurs |
| PUT | `/admin/users/:id/status` | Oui (admin) | Bannir / suspendre |
| GET | `/admin/jobs` | Oui (admin) | Modération offres |
| DELETE | `/admin/jobs/:id` | Oui (admin) | Supprimer offre |

### Format des réponses API (standard)
```json
// Succès
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}

// Erreur
{
  "success": false,
  "error": "Message d'erreur lisible",
  "code": 400
}
```

### Envoi du token JWT (côté front)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 6. Schéma base de données (Prisma)

> ⚠️ **Prisma 7** (≠ tutoriels Prisma 5) : l'URL de connexion n'est plus dans `schema.prisma`
> mais dans `prisma.config.ts` (CLI/migrations → `DIRECT_URL`). Le runtime utilise `DATABASE_URL`
> via le driver adapter pg dans `src/lib/prisma.ts`. Client généré dans `src/generated/prisma/` (gitignoré).

```prisma
// schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URL gérée par prisma.config.ts (Prisma 7)
}

enum Role {
  STUDENT
  COMPANY
  ADMIN
}

enum JobType {
  STAGE
  ALTERNANCE
  CDI
  CDD
  FREELANCE
}

enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  INTERVIEW
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  student  Student?
  company  Company?
  sentMessages     Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")
}

model Student {
  id          String   @id @default(uuid())
  userId      String   @unique
  firstName   String
  lastName    String
  phone       String?
  ville       String?
  bio         String?
  skills      String[]
  photoUrl    String?
  cvUrl       String?
  formations  Json?
  experiences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications Application[]
}

model Company {
  id          String   @id @default(uuid())
  userId      String   @unique
  name        String
  secteur     String?
  ville       String?
  description String?
  logoUrl     String?
  website     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs Job[]
}

model Job {
  id          String   @id @default(uuid())
  companyId   String
  title       String
  description String
  type        JobType
  ville       String?
  secteur     String?
  duration    String?
  salary      String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company      Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  applications Application[]
}

model Application {
  id          String            @id @default(uuid())
  studentId   String
  jobId       String
  status      ApplicationStatus @default(PENDING)
  coverLetter String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  job     Job     @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([studentId, jobId]) // un étudiant ne peut postuler qu'une fois par offre
}

model Message {
  id             String   @id @default(uuid())
  senderId       String
  receiverId     String
  conversationId String
  content        String
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())

  sender   User @relation("SentMessages", fields: [senderId], references: [id])
  receiver User @relation("ReceivedMessages", fields: [receiverId], references: [id])
}
```

---

## 7. Lancer le projet en local

### Prérequis
- Node.js 22+ (24 LTS recommandé — Node 20 est EOL depuis avril 2026)
- npm ou pnpm
- Compte Neon (créer un projet gratuit sur neon.tech)
- Compte Cloudinary (gratuit)

### Backend
```bash
git clone https://github.com/abdou1-dev/stageconnect-back.git
cd stageconnect-back
npm install

# Copier et remplir les variables
cp .env.example .env

# Générer le client Prisma + migrer la base
npx prisma generate
npx prisma migrate dev --name init

# Lancer en dev
npm run dev   # nodemon sur port 3001
```

### Frontend
```bash
git clone https://github.com/abdou1-dev/stageconnect-front.git
cd stageconnect-front
npm install

# Copier et remplir les variables
cp .env.local.example .env.local

# Lancer en dev
npm run dev   # port 3000
```

### Vérifier que tout marche
```
GET http://localhost:3001/api/health  →  { "status": "ok" }
GET http://localhost:3000             →  Landing page
```

---

## 8. Workflow de développement (résumé)

```
1. Tirer la dernière version de develop
   git checkout develop && git pull

2. Créer une branche feature
   git checkout -b feature/nom-de-la-feature

3. Coder + commits réguliers
   git commit -m "feat(scope): description courte"

4. Push et ouvrir une PR vers develop
   git push origin feature/nom-de-la-feature

5. Review mutuelle → merge dans develop

6. Fin de phase → merge develop dans main (release)
```

---

## 9. Checklist avant chaque PR

- [ ] Le code compile sans erreurs
- [ ] Les routes API retournent le bon format `{ success, data, message }`
- [ ] Les variables d'environnement nécessaires sont documentées dans ce fichier
- [ ] Pas de `console.log` de debug laissés dans le code
- [ ] Les routes protégées ont bien le middleware `auth` appliqué
- [ ] Testé manuellement sur Postman (back) ou navigateur (front)

---

## 10. Liens du projet

| Ressource | Lien |
|-----------|------|
| Repo Frontend | https://github.com/abdou1-dev/stageconnect-front |
| Repo Backend | https://github.com/abdou1-dev/stageconnect-back |
| Vercel (front prod) | À compléter après déploiement |
| Render (back prod) | À compléter après déploiement |
| Neon Dashboard | https://console.neon.tech |
| Figma Maquettes | À compléter |
| Trello / Gestion projet | À compléter |
| Vidéo de démo | À compléter |
| Mémoire Google Doc | https://docs.google.com/document/d/1Zq_8qLiSq0ptJ5mBHB5-bYU9deJsxkwPbnTfdquW0Z0 |

---

*Dernière mise à jour : Juin 2026 — Abdoulaye DIAW*
