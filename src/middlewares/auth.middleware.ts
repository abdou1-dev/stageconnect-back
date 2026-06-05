// Vérification du JWT envoyé en header : Authorization: Bearer <token>
import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { HttpError } from '../lib/errors'

export type Role = 'STUDENT' | 'COMPANY' | 'ADMIN'

// Payload signé au login : { userId, role }
export interface AuthUser {
  userId: string
  role: Role
}

// Ajoute req.user à Express (declaration merging)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Token manquant')
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as AuthUser
    req.user = { userId: payload.userId, role: payload.role }
  } catch {
    throw new HttpError(401, 'Token invalide ou expiré')
  }
  next()
}
