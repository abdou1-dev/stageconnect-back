// Middleware d'erreur centralisé — TOUTE erreur de l'API finit ici.
// Format unifié (décision 05/06/2026) : { success: false, error: string, code: number }
// Express 5 attrape automatiquement les rejets des handlers async → pas besoin
// de try/catch dans les controllers, il suffit de throw.
import { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'

import { HttpError } from '../lib/errors'

// 404 — routes inconnues (à monter APRÈS toutes les routes)
export function notFound(req: Request, _res: Response): never {
  throw new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`)
}

// Les erreurs Multer (taille, champ inattendu…) sont des erreurs CLIENT → 400
const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Fichier trop volumineux (limite : 2 Mo pour les images, 5 Mo pour les PDF)',
  LIMIT_UNEXPECTED_FILE: 'Champ de fichier inattendu — utilisez le champ « file »',
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // requis par Express pour identifier un middleware d'erreur (4 paramètres)
  _next: NextFunction
): void {
  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      error: MULTER_MESSAGES[err.code] ?? `Upload invalide : ${err.message}`,
      code: 400,
    })
    return
  }

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
