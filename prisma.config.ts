// Config Prisma 7 — remplace les blocs url/directUrl du schema.prisma.
// dotenv est OBLIGATOIRE : Prisma 7 ne charge plus .env automatiquement.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Connexion DIRECTE (non poolée) — utilisée par le CLI pour les migrations (requis Neon).
    // Le client runtime utilise DATABASE_URL (pooler) via l'adapter pg (src/lib/prisma.ts).
    url: env('DIRECT_URL'),
  },
})
