// Crée (ou promeut) le compte administrateur — à exécuter manuellement :
//   $env:ADMIN_EMAIL='admin@...'; $env:ADMIN_PASSWORD='...'; npx ts-node scripts/create-admin.ts
// Les identifiants passent par variables d'environnement, jamais en dur.
import 'dotenv/config'
import bcrypt from 'bcrypt'

import { prisma } from '../src/lib/prisma'

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Variables ADMIN_EMAIL et ADMIN_PASSWORD requises')
  }
  if (password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères')
  }

  const hashed = await bcrypt.hash(password, 10)

  // upsert : si le compte existe déjà, on le promeut ADMIN sans toucher
  // à son mot de passe ; sinon on le crée.
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: { email, password: hashed, role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true, email: true, role: true, status: true },
  })

  console.log(`✅ Admin prêt : ${admin.email} (${admin.role}/${admin.status}) — id ${admin.id}`)
}

main()
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
