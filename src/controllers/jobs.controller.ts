import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { JobType } from '../generated/prisma/client'

export async function listJobs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const type = typeof req.query.type === 'string' ? req.query.type : undefined
  const ville = typeof req.query.ville === 'string' ? req.query.ville : undefined
  const secteur = typeof req.query.secteur === 'string' ? req.query.secteur : undefined

  if (type && !Object.values(JobType).includes(type as JobType)) {
    throw new HttpError(400, `Type invalide. Valeurs acceptées : ${Object.values(JobType).join(', ')}`)
  }

  const where = {
    isActive: true,
    ...(type && { type: type as JobType }),
    ...(ville && { ville: { contains: ville, mode: 'insensitive' as const } }),
    ...(secteur && { secteur: { contains: secteur, mode: 'insensitive' as const } }),
  }

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      include: {
        company: {
          select: { id: true, name: true, logoUrl: true, ville: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.count({ where }),
  ])

  res.json({
    success: true,
    data: { jobs, total, page, limit },
    message: 'Liste récupérée',
  })
}

export async function getJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, ville: true, secteur: true, website: true },
      },
      _count: { select: { applications: true } },
    },
  })
  if (!job) throw new HttpError(404, 'Offre introuvable')

  res.json({ success: true, data: job, message: 'Offre récupérée' })
}

export async function createJob(req: Request, res: Response): Promise<void> {
  const company = await prisma.company.findUnique({ where: { userId: req.user!.userId } })
  if (!company) throw new HttpError(404, 'Profil entreprise introuvable')

  const { title, description, type, ville, secteur, duration, salary } = req.body as {
    title: string
    description: string
    type: string
    ville?: string
    secteur?: string
    duration?: string
    salary?: string
  }

  if (!Object.values(JobType).includes(type as JobType)) {
    throw new HttpError(400, `Type invalide. Valeurs acceptées : ${Object.values(JobType).join(', ')}`)
  }

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      title,
      description,
      type: type as JobType,
      ...(ville && { ville }),
      ...(secteur && { secteur }),
      ...(duration && { duration }),
      ...(salary && { salary }),
    },
  })

  res.status(201).json({ success: true, data: job, message: 'Offre créée' })
}

export async function updateJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const job = await prisma.job.findUnique({
    where: { id },
    include: { company: { select: { userId: true } } },
  })
  if (!job) throw new HttpError(404, 'Offre introuvable')

  if (job.company.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : vous ne pouvez modifier que vos propres offres')
  }

  const { title, description, type, ville, secteur, duration, salary, isActive } = req.body as {
    title?: string
    description?: string
    type?: string
    ville?: string
    secteur?: string
    duration?: string
    salary?: string
    isActive?: boolean
  }

  if (type && !Object.values(JobType).includes(type as JobType)) {
    throw new HttpError(400, `Type invalide. Valeurs acceptées : ${Object.values(JobType).join(', ')}`)
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type: type as JobType }),
      ...(ville !== undefined && { ville }),
      ...(secteur !== undefined && { secteur }),
      ...(duration !== undefined && { duration }),
      ...(salary !== undefined && { salary }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  res.json({ success: true, data: updated, message: 'Offre mise à jour' })
}

export async function deleteJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const job = await prisma.job.findUnique({
    where: { id },
    include: { company: { select: { userId: true } } },
  })
  if (!job) throw new HttpError(404, 'Offre introuvable')

  if (job.company.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : vous ne pouvez supprimer que vos propres offres')
  }

  await prisma.job.delete({ where: { id } })

  res.json({ success: true, data: null, message: 'Offre supprimée' })
}
