// Instance Prisma singleton — évite de multiplier les connexions
// à chaque rechargement nodemon en dev.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
  // DATABASE_URL = URL poolée Neon (le CLI de migration utilise DIRECT_URL, cf. prisma.config.ts)
  connectionString: process.env.DATABASE_URL!,
})

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
