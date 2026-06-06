import { Router } from 'express'

import { createJob, deleteJob, getJob, listJobs, updateJob } from '../controllers/jobs.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { requireFields } from '../middlewares/validate.middleware'

const router = Router()

router.get('/', listJobs)
router.get('/:id', getJob)
router.post('/', requireAuth, requireRole('COMPANY'), requireFields('title', 'description', 'type'), createJob)
router.put('/:id', requireAuth, requireRole('COMPANY'), updateJob)
router.delete('/:id', requireAuth, requireRole('COMPANY'), deleteJob)

export default router
