import { Router } from 'express'

import { login, me, register } from '../controllers/auth.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireFields } from '../middlewares/validate.middleware'

const router = Router()

router.post('/register', requireFields('email', 'password', 'role'), register)
router.post('/login', requireFields('email', 'password'), login)
router.get('/me', requireAuth, me)

export default router
