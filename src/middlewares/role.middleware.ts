// Restriction par rôle — à utiliser APRÈS requireAuth.
// Exemple : router.post('/', requireAuth, requireRole('COMPANY'), createJob)
import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/errors'
import { Role } from './auth.middleware'

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError(401, 'Non authentifié')
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'Accès refusé : rôle insuffisant')
    }
    next()
  }
}
