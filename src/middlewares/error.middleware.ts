// Middleware d'erreur centralisé — TOUTE erreur de l'API finit ici.
// Format unifié (décision 05/06/2026) : { success: false, error: string, code: number }
// Express 5 attrape automatiquement les rejets des handlers async → pas besoin
// de try/catch dans les controllers, il suffit de throw.
import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/errors'

// 404 — routes inconnues (à monter APRÈS toutes les routes)
export function notFound(req: Request, _res: Response): never {
  throw new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`)
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // requis par Express pour identifier un middleware d'erreur (4 paramètres)
  _next: NextFunction
): void {
  const isHttpError = err instanceof HttpError
  const code = isHttpError ? err.code : 500

  // En prod, ne jamais exposer le détail des erreurs 500 (stack, requêtes SQL…)
  const error = isHttpError
    ? err.message
    : process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err instanceof Error
        ? err.message
        : 'Erreur inconnue'

  if (!isHttpError) {
    console.error('[ERREUR NON GÉRÉE]', err)
  }

  res.status(code).json({ success: false, error, code })
}
