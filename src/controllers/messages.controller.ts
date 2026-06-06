import { Request, Response } from 'express'

import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'

// conversationId = les deux userId triés et joints — identique peu importe l'expéditeur
function makeConversationId(a: string, b: string): string {
  return [a, b].sort().join('_')
}

const participantSelect = {
  id: true,
  role: true,
  student: { select: { firstName: true, lastName: true, photoUrl: true } },
  company: { select: { name: true, logoUrl: true } },
} as const

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const senderId = req.user!.userId
  const { receiverId, content } = req.body as { receiverId: string; content: string }

  if (senderId === receiverId) {
    throw new HttpError(400, 'Vous ne pouvez pas vous envoyer un message à vous-même')
  }

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
  if (!receiver) throw new HttpError(404, 'Destinataire introuvable')

  const conversationId = makeConversationId(senderId, receiverId)

  const msg = await prisma.message.create({
    data: { senderId, receiverId, conversationId, content },
    include: {
      sender: { select: participantSelect },
      receiver: { select: participantSelect },
    },
  })

  res.status(201).json({ success: true, data: msg, message: 'Message envoyé' })
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.conversationId as string
  const userId = req.user!.userId

  // Vérifier que l'utilisateur fait partie de cette conversation
  const isMember = await prisma.message.findFirst({
    where: { conversationId, OR: [{ senderId: userId }, { receiverId: userId }] },
  })
  if (!isMember) throw new HttpError(403, 'Vous ne faites pas partie de cette conversation')

  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)))
  const skip = (page - 1) * limit

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: participantSelect } },
    }),
    prisma.message.count({ where: { conversationId } }),
  ])

  // Marquer les messages reçus par cet utilisateur comme lus
  await prisma.message.updateMany({
    where: { conversationId, receiverId: userId, isRead: false },
    data: { isRead: true },
  })

  res.json({ success: true, data: { messages, total, page, limit }, message: 'Messages récupérés' })
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId

  const convIds = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    select: { conversationId: true },
    distinct: ['conversationId'],
  })

  if (convIds.length === 0) {
    res.json({ success: true, data: [], message: 'Aucune conversation' })
    return
  }

  const conversations = await Promise.all(
    convIds.map(async ({ conversationId }) => {
      const [lastMessage, unread] = await prisma.$transaction([
        prisma.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: participantSelect },
            receiver: { select: participantSelect },
          },
        }),
        prisma.message.count({
          where: { conversationId, receiverId: userId, isRead: false },
        }),
      ])
      return { conversationId, lastMessage, unread }
    })
  )

  // Plus récent en premier
  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt.getTime() ?? 0
    const bTime = b.lastMessage?.createdAt.getTime() ?? 0
    return bTime - aTime
  })

  res.json({ success: true, data: conversations, message: 'Conversations récupérées' })
}
