// Controllers admin — modération des utilisateurs et des offres.
// Toutes les routes sont derrière requireAuth + requireRole('ADMIN').
import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { UserStatus } from '../generated/prisma/client'

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const [users, total, activeJobs, totalApplications] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        student: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    // Compteurs globaux pour les stats du dashboard admin
    prisma.job.count({ where: { isActive: true } }),
    prisma.application.count(),
  ])

  res.json({
    success: true,
    data: { users, total, page, limit, stats: { activeJobs, totalApplications } },
    message: 'Utilisateurs récupérés',
  })
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string
  const { status } = req.body as { status: string }

  if (!Object.values(UserStatus).includes(status as UserStatus)) {
    throw new HttpError(
      400,
      `Statut invalide. Valeurs acceptées : ${Object.values(UserStatus).join(', ')}`
    )
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new HttpError(404, 'Utilisateur introuvable')

  // Garde-fous : pas de modération entre admins, ni sur soi-même
  if (user.role === 'ADMIN') {
    throw new HttpError(403, 'Impossible de modifier le statut d’un administrateur')
  }
  if (user.id === req.user!.userId) {
    throw new HttpError(403, 'Impossible de modifier son propre statut')
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: status as UserStatus },
    select: { id: true, email: true, role: true, status: true },
  })

  res.json({ success: true, data: updated, message: 'Statut utilisateur mis à jour' })
}

export async function listAllJobs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      skip,
      take: limit,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.count(),
  ])

  res.json({
    success: true,
    data: { jobs, total, page, limit },
    message: 'Offres récupérées',
  })
}

export async function deleteJobAsAdmin(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) throw new HttpError(404, 'Offre introuvable')

  await prisma.job.delete({ where: { id } })

  res.json({ success: true, data: null, message: 'Offre supprimée (modération)' })
}
