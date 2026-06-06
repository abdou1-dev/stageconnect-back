import { Request } from 'express'
import multer, { FileFilterCallback } from 'multer'

import { HttpError } from '../lib/errors'

const memory = multer.memoryStorage()

function filterMimes(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new HttpError(400, `Type non autorisé. Formats acceptés : ${allowed.join(', ')}`))
    }
  }
}

// Images : photo étudiant, logo entreprise (max 2 Mo)
export const uploadImage = multer({
  storage: memory,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: filterMimes(['image/jpeg', 'image/png', 'image/webp']),
})

// PDF uniquement : CV étudiant (max 5 Mo)
export const uploadPdf = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: filterMimes(['application/pdf']),
})
