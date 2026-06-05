// Validation minimale du body — vérifie la présence de champs requis.
// Exemple : router.post('/login', requireFields('email', 'password'), login)
import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/errors'

export function requireFields(...fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const missing = fields.filter((f) => body[f] === undefined || body[f] === '')
    if (missing.length > 0) {
      throw new HttpError(400, `Champs requis manquants : ${missing.join(', ')}`)
    }
    next()
  }
}
