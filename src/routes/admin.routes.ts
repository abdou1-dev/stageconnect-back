// Routes /api/admin — modération (réservé au rôle ADMIN)
import { Router } from 'express'

import {
  deleteJobAsAdmin,
  listAllJobs,
  listUsers,
  updateUserStatus,
} from '../controllers/admin.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { requireFields } from '../middlewares/validate.middleware'

const router = Router()

// Tout /api/admin/* exige le rôle ADMIN
router.use(requireAuth, requireRole('ADMIN'))

router.get('/users', listUsers)
router.put('/users/:id/status', requireFields('status'), updateUserStatus)
router.get('/jobs', listAllJobs)
router.delete('/jobs/:id', deleteJobAsAdmin)

export default router
