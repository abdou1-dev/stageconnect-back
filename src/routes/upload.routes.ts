import { Router } from 'express'

import {
  uploadCompanyLogo,
  uploadStudentCv,
  uploadStudentPhoto,
} from '../controllers/upload.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { uploadImage, uploadPdf } from '../middlewares/upload.middleware'

const router = Router()

// Champ multipart attendu : "file" dans tous les cas
router.post('/photo', requireAuth, requireRole('STUDENT'), uploadImage.single('file'), uploadStudentPhoto)
router.post('/cv', requireAuth, requireRole('STUDENT'), uploadPdf.single('file'), uploadStudentCv)
router.post('/logo', requireAuth, requireRole('COMPANY'), uploadImage.single('file'), uploadCompanyLogo)

export default router
