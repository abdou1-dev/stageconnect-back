import { Router } from 'express'

import {
  apply,
  cancelApplication,
  jobApplications,
  myApplications,
  updateApplicationStatus,
} from '../controllers/applications.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { requireFields } from '../middlewares/validate.middleware'

const router = Router()

// /mine AVANT /:id pour éviter que Express interprète "mine" comme un id
router.get('/mine', requireAuth, requireRole('STUDENT'), myApplications)
router.get('/job/:jobId', requireAuth, requireRole('COMPANY'), jobApplications)
router.post('/', requireAuth, requireRole('STUDENT'), requireFields('jobId'), apply)
router.delete('/:id', requireAuth, requireRole('STUDENT'), cancelApplication)
router.put('/:id/status', requireAuth, requireRole('COMPANY'), requireFields('status'), updateApplicationStatus)

export default router
