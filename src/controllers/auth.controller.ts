import bcrypt from 'bcrypt'
import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { createToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, role, firstName, lastName, name } = req.body as {
    email: string
    password: string
    role: string
    firstName?: string
    lastName?: string
    name?: string
  }

  if (!['STUDENT', 'COMPANY'].includes(role)) {
    throw new HttpError(400, 'Rôle invalide : STUDENT ou COMPANY attendu')
  }
  // Ne jamais faire confiance au client : le front valide aussi, on revalide ici
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères')
  }
  if (role === 'STUDENT' && (!firstName || !lastName)) {
    throw new HttpError(400, 'Champs requis manquants : firstName, lastName')
  }
  if (role === 'COMPANY' && !name) {
    throw new HttpError(400, 'Champs requis manquants : name')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new HttpError(409, 'Email déjà utilisé')

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: role as 'STUDENT' | 'COMPANY',
      ...(role === 'STUDENT'
        ? { student: { create: { firstName: firstName!, lastName: lastName! } } }
        : { company: { create: { name: name! } } }),
    },
    include: { student: true, company: true },
  })

  const token = createToken(user.id, user.role)
  const { password: _pwd, ...userWithoutPassword } = user

  res.status(201).json({
    success: true,
    data: { token, user: userWithoutPassword },
    message: 'Compte créé avec succès',
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { student: true, company: true },
  })
  if (!user) throw new HttpError(401, 'Email ou mot de passe incorrect')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new HttpError(401, 'Email ou mot de passe incorrect')

  // Modération : les comptes sanctionnés ne peuvent plus se connecter
  if (user.status === 'BANNED') {
    throw new HttpError(403, 'Ce compte a été banni. Contactez l’équipe StageConnect.')
  }
  if (user.status === 'SUSPENDED') {
    throw new HttpError(403, 'Ce compte est suspendu temporairement. Contactez l’équipe StageConnect.')
  }

  const token = createToken(user.id, user.role)
  const { password: _pwd, ...userWithoutPassword } = user

  res.json({
    success: true,
    data: { token, user: userWithoutPassword },
    message: 'Connexion réussie',
  })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string
    newPassword: string
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new HttpError(400, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, 'Le nouveau mot de passe doit être différent de l\'ancien')
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) throw new HttpError(404, 'Utilisateur introuvable')

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new HttpError(401, 'Mot de passe actuel incorrect')

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  res.json({ success: true, data: null, message: 'Mot de passe mis à jour' })
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { student: true, company: true },
  })
  if (!user) throw new HttpError(404, 'Utilisateur introuvable')

  const { password: _pwd, ...userWithoutPassword } = user

  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'Profil récupéré',
  })
}
