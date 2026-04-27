import '@fastify/websocket'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { wsManager } from '../services/websocket'
import { createNotification } from '../services/notifications'
import { notifyNewMessage } from '../services/email'

const CONV_INCLUDE = {
  job: { select: { id: true, title: true, category: { select: { icon: true, name: true } } } },
  client: { select: { user: { select: { id: true, name: true } } } },
  contractor: { select: { user: { select: { id: true, name: true } } } },
}

export async function conversationRoutes(app: FastifyInstance) {
  // WebSocket endpoint — auth via ?token= query param
  app.get('/ws', { websocket: true } as any, async (connection: any, request: any) => {
    const token = (request.query as { token?: string }).token
    if (!token) { connection.socket.close(1008, 'Token required'); return }
    let userId: string
    try {
      const decoded = app.jwt.verify<{ id: string }>(token)
      userId = decoded.id
    } catch {
      connection.socket.close(1008, 'Invalid token')
      return
    }
    wsManager.add(userId, connection.socket)
    connection.socket.on('close', () => wsManager.remove(userId, connection.socket))
    connection.socket.send(JSON.stringify({ type: 'CONNECTED', data: { userId } }))
  })

  // GET /conversations
  app.get('/conversations', { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.user.id
    const [clientProfile, contractorProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId } }),
      prisma.contractorProfile.findUnique({ where: { userId } }),
    ])
    const conditions = []
    if (clientProfile) conditions.push({ clientId: clientProfile.id })
    if (contractorProfile) conditions.push({ contractorId: contractorProfile.id })
    if (conditions.length === 0) return []

    const conversations = await prisma.conversation.findMany({
      where: { OR: conditions },
      include: {
        ...CONV_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { file: true } },
        _count: {
          select: { messages: { where: { readAt: null, senderId: { not: userId } } } },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return conversations.map((c) => ({
      ...c,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      messages: undefined,
      _count: undefined,
    }))
  })

  // GET /conversations/:id/messages
  app.get<{ Params: { id: string }; Querystring: { page?: string } }>(
    '/conversations/:id/messages',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.id
      const conv = await prisma.conversation.findUnique({ where: { id: request.params.id }, include: CONV_INCLUDE })
      if (!conv) return reply.status(404).send({ error: 'Conversation not found' })

      const [clientProfile, contractorProfile] = await Promise.all([
        prisma.clientProfile.findUnique({ where: { userId } }),
        prisma.contractorProfile.findUnique({ where: { userId } }),
      ])
      const isParticipant =
        (clientProfile && conv.clientId === clientProfile.id) ||
        (contractorProfile && conv.contractorId === contractorProfile.id)
      if (!isParticipant) return reply.status(403).send({ error: 'Access denied' })

      const page = Math.max(1, Number(request.query.page ?? 1))
      const limit = 50
      const skip = (page - 1) * limit

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { conversationId: conv.id },
          include: { file: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.message.count({ where: { conversationId: conv.id } }),
      ])

      await prisma.message.updateMany({
        where: { conversationId: conv.id, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      })

      return { messages: messages.reverse(), hasMore: skip + messages.length < total, total }
    },
  )

  // POST /conversations/:id/messages
  app.post<{ Params: { id: string }; Body: { content: string; fileId?: string } }>(
    '/conversations/:id/messages',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.id
      const { content, fileId } = request.body
      if (!content?.trim()) return reply.status(400).send({ error: 'content is required' })

      const conv = await prisma.conversation.findUnique({ where: { id: request.params.id }, include: CONV_INCLUDE })
      if (!conv) return reply.status(404).send({ error: 'Conversation not found' })

      const [clientProfile, contractorProfile] = await Promise.all([
        prisma.clientProfile.findUnique({ where: { userId } }),
        prisma.contractorProfile.findUnique({ where: { userId } }),
      ])
      const isParticipant =
        (clientProfile && conv.clientId === clientProfile.id) ||
        (contractorProfile && conv.contractorId === contractorProfile.id)
      if (!isParticipant) return reply.status(403).send({ error: 'Access denied' })

      const message = await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: userId,
          content: content.trim(),
          messageType: fileId ? 'FILE' : 'TEXT',
          ...(fileId ? { fileId } : {}),
        },
        include: { file: true },
      })

      await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } })

      const senderIsClient = !!(clientProfile && conv.clientId === clientProfile.id)
      const recipientUserId = senderIsClient ? conv.contractor.user.id : conv.client.user.id
      const senderName = senderIsClient ? conv.client.user.name : conv.contractor.user.name
      const recipientName = senderIsClient ? conv.contractor.user.name : conv.client.user.name

      wsManager.send(recipientUserId, 'NEW_MESSAGE', { message, conversationId: conv.id })

      await createNotification({
        userId: recipientUserId,
        type: 'NEW_MESSAGE',
        title: `New message from ${senderName}`,
        body: content.trim().slice(0, 100),
        link: `/messages/${conv.id}`,
        emailFn: () =>
          notifyNewMessage(recipientUserId, {
            recipientName,
            senderName,
            jobTitle: conv.job.title,
            preview: content.trim().slice(0, 100),
          }),
      })

      return reply.status(201).send(message)
    },
  )

  // POST /jobs/:id/conversations — create or get conversation
  app.post<{ Params: { id: string }; Body: { contractorId?: string } }>(
    '/jobs/:id/conversations',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.id
      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })

      const [clientProfile, contractorProfile] = await Promise.all([
        prisma.clientProfile.findUnique({ where: { userId } }),
        prisma.contractorProfile.findUnique({ where: { userId } }),
      ])

      let clientId: string
      let contractorProfileId: string

      if (clientProfile && job.clientId === clientProfile.id) {
        const cid = request.body.contractorId
        if (!cid) return reply.status(400).send({ error: 'contractorId is required' })
        const quote = await prisma.quote.findFirst({ where: { jobId: job.id, contractorId: cid } })
        if (!quote) return reply.status(400).send({ error: 'Contractor has not quoted this job' })
        clientId = clientProfile.id
        contractorProfileId = cid
      } else if (contractorProfile) {
        const quote = await prisma.quote.findFirst({ where: { jobId: job.id, contractorId: contractorProfile.id } })
        if (!quote) return reply.status(400).send({ error: 'You have not quoted this job' })
        clientId = job.clientId
        contractorProfileId = contractorProfile.id
      } else {
        return reply.status(403).send({ error: 'Access denied' })
      }

      const conversation = await prisma.conversation.upsert({
        where: { jobId_contractorId: { jobId: job.id, contractorId: contractorProfileId } },
        create: { jobId: job.id, clientId, contractorId: contractorProfileId },
        update: {},
      })

      return { conversationId: conversation.id }
    },
  )
}
