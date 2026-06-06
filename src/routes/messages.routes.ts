import { Router } from 'express'

import {
  getConversation,
  listConversations,
  sendMessage,
} from '../controllers/messages.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireFields } from '../middlewares/validate.middleware'

const router = Router()

// /conversations AVANT /:conversationId — sinon Express prend "conversations" pour un id
router.get('/conversations', requireAuth, listConversations)
router.get('/:conversationId', requireAuth, getConversation)
router.post('/', requireAuth, requireFields('receiverId', 'content'), sendMessage)

export default router
