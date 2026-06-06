import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'

export async function getCompany(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, createdAt: true } },
      jobs: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, type: true, ville: true, createdAt: true },
      },
    },
  })
  if (!company) throw new HttpError(404, 'Entreprise introuvable')

  res.json({ success: true, data: company, message: 'Fiche récupérée' })
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const company = await prisma.company.findUnique({ where: { id } })
  if (!company) throw new HttpError(404, 'Entreprise introuvable')

  if (company.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : vous ne pouvez modifier que votre propre fiche')
  }

  const { name, secteur, ville, description, website } = req.body as {
    name?: string
    secteur?: string
    ville?: string
    description?: string
    website?: string
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(secteur !== undefined && { secteur }),
      ...(ville !== undefined && { ville }),
      ...(description !== undefined && { description }),
      ...(website !== undefined && { website }),
    },
  })

  res.json({ success: true, data: updated, message: 'Fiche mise à jour' })
}

export async function listCompanies(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const secteur = typeof req.query.secteur === 'string' ? req.query.secteur : undefined
  const ville = typeof req.query.ville === 'string' ? req.query.ville : undefined

  const where = {
    ...(secteur && { secteur: { contains: secteur, mode: 'insensitive' as const } }),
    ...(ville && { ville: { contains: ville, mode: 'insensitive' as const } }),
  }

  const [companies, total] = await prisma.$transaction([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        secteur: true,
        ville: true,
        logoUrl: true,
        description: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.company.count({ where }),
  ])

  res.json({
    success: true,
    data: { companies, total, page, limit },
    message: 'Liste récupérée',
  })
}
