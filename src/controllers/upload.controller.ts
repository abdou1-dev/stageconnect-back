import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { uploadStream } from '../lib/cloudinary'
import { prisma } from '../lib/prisma'

export async function uploadStudentPhoto(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(400, 'Fichier manquant (champ : file)')

  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new HttpError(404, 'Profil étudiant introuvable')

  const { secure_url } = await uploadStream(req.file.buffer, {
    folder: 'stageconnect/photos',
    public_id: `student_${student.id}`,
    overwrite: true,
    // Recadrage centré sur le visage, carré 400px
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  })

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { photoUrl: secure_url },
    select: { id: true, photoUrl: true },
  })

  res.json({ success: true, data: updated, message: 'Photo mise à jour' })
}

export async function uploadStudentCv(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(400, 'Fichier manquant (champ : file)')

  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new HttpError(404, 'Profil étudiant introuvable')

  const { secure_url } = await uploadStream(req.file.buffer, {
    folder: 'stageconnect/cvs',
    public_id: `cv_${student.id}`,
    overwrite: true,
    resource_type: 'raw', // PDF = ressource brute, pas une image
  })

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { cvUrl: secure_url },
    select: { id: true, cvUrl: true },
  })

  res.json({ success: true, data: updated, message: 'CV mis à jour' })
}

export async function uploadCompanyLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(400, 'Fichier manquant (champ : file)')

  const company = await prisma.company.findUnique({ where: { userId: req.user!.userId } })
  if (!company) throw new HttpError(404, 'Profil entreprise introuvable')

  const { secure_url } = await uploadStream(req.file.buffer, {
    folder: 'stageconnect/logos',
    public_id: `logo_${company.id}`,
    overwrite: true,
    transformation: [{ width: 300, height: 300, crop: 'limit' }],
  })

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { logoUrl: secure_url },
    select: { id: true, logoUrl: true },
  })

  res.json({ success: true, data: updated, message: 'Logo mis à jour' })
}
