import { Router } from 'express'

import { getCompany, listCompanies, updateCompany } from '../controllers/companies.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', listCompanies)
router.get('/:id', getCompany)
router.put('/:id', requireAuth, updateCompany)

export default router
