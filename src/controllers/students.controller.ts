import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'

export async function getStudent(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: { select: { email: true, role: true, createdAt: true } } },
  })
  if (!student) throw new HttpError(404, 'Étudiant introuvable')

  res.json({ success: true, data: student, message: 'Profil récupéré' })
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) throw new HttpError(404, 'Étudiant introuvable')

  if (student.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : vous ne pouvez modifier que votre propre profil')
  }

  const { firstName, lastName, phone, ville, bio, skills, formations, experiences, photoUrl, cvUrl } =
    req.body as {
      firstName?: string
      lastName?: string
      phone?: string
      ville?: string
      bio?: string
      skills?: string[]
      formations?: Prisma.InputJsonValue
      experiences?: Prisma.InputJsonValue
      photoUrl?: string
      cvUrl?: string
    }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(ville !== undefined && { ville }),
      ...(bio !== undefined && { bio }),
      ...(skills !== undefined && { skills }),
      ...(formations !== undefined && { formations }),
      ...(experiences !== undefined && { experiences }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(cvUrl !== undefined && { cvUrl }),
    },
  })

  res.json({ success: true, data: updated, message: 'Profil mis à jour' })
}

export async function listStudents(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      skip,
      take: limit,
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count(),
  ])

  res.json({
    success: true,
    data: { students, total, page, limit },
    message: 'Liste récupérée',
  })
}
