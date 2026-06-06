import { Router } from 'express'

import { getStudent, listStudents, updateStudent } from '../controllers/students.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'

const router = Router()

router.get('/', requireAuth, requireRole('ADMIN', 'COMPANY'), listStudents)
router.get('/:id', requireAuth, getStudent)
router.put('/:id', requireAuth, updateStudent)

export default router
