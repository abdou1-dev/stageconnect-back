import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { ApplicationStatus } from '../generated/prisma/client'

export async function apply(req: Request, res: Response): Promise<void> {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new HttpError(404, 'Profil étudiant introuvable')

  const { jobId, coverLetter } = req.body as { jobId: string; coverLetter?: string }

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new HttpError(404, 'Offre introuvable')
  if (!job.isActive) throw new HttpError(400, 'Cette offre n\'est plus active')

  const existing = await prisma.application.findUnique({
    where: { studentId_jobId: { studentId: student.id, jobId } },
  })
  if (existing) throw new HttpError(409, 'Vous avez déjà postulé à cette offre')

  const application = await prisma.application.create({
    data: {
      studentId: student.id,
      jobId,
      ...(coverLetter && { coverLetter }),
    },
    include: {
      job: { select: { title: true, type: true, company: { select: { name: true } } } },
    },
  })

  res.status(201).json({ success: true, data: application, message: 'Candidature envoyée' })
}

export async function myApplications(req: Request, res: Response): Promise<void> {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new HttpError(404, 'Profil étudiant introuvable')

  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const [applications, total] = await prisma.$transaction([
    prisma.application.findMany({
      where: { studentId: student.id },
      skip,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            type: true,
            ville: true,
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.application.count({ where: { studentId: student.id } }),
  ])

  res.json({
    success: true,
    data: { applications, total, page, limit },
    message: 'Candidatures récupérées',
  })
}

export async function jobApplications(req: Request, res: Response): Promise<void> {
  const jobId = req.params.jobId as string

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: { select: { userId: true } } },
  })
  if (!job) throw new HttpError(404, 'Offre introuvable')

  if (job.company.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : cette offre ne vous appartient pas')
  }

  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)))
  const skip = (page - 1) * limit

  const [applications, total] = await prisma.$transaction([
    prisma.application.findMany({
      where: { jobId },
      skip,
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ville: true,
            photoUrl: true,
            cvUrl: true,
            skills: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.application.count({ where: { jobId } }),
  ])

  res.json({
    success: true,
    data: { applications, total, page, limit },
    message: 'Candidatures récupérées',
  })
}

export async function cancelApplication(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string

  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new HttpError(404, 'Profil étudiant introuvable')

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application) throw new HttpError(404, 'Candidature introuvable')

  if (application.studentId !== student.id) {
    throw new HttpError(403, 'Accès refusé : cette candidature ne vous appartient pas')
  }
  if (application.status !== 'PENDING') {
    throw new HttpError(400, 'Seule une candidature en attente (PENDING) peut être annulée')
  }

  await prisma.application.delete({ where: { id } })

  res.json({ success: true, data: null, message: 'Candidature annulée' })
}

export async function updateApplicationStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string
  const { status } = req.body as { status: string }

  if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
    throw new HttpError(
      400,
      `Statut invalide. Valeurs acceptées : ${Object.values(ApplicationStatus).join(', ')}`
    )
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { job: { include: { company: { select: { userId: true } } } } },
  })
  if (!application) throw new HttpError(404, 'Candidature introuvable')

  if (application.job.company.userId !== req.user!.userId) {
    throw new HttpError(403, 'Accès refusé : cette candidature ne vous appartient pas')
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status: status as ApplicationStatus },
  })

  res.json({ success: true, data: updated, message: 'Statut mis à jour' })
}
