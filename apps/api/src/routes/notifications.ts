import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { onRequest: [app.authenticate] }, async (request, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unreadCount = notifications.filter((n) => !n.readAt).length
    reply.header('X-Unread-Count', String(unreadCount))
    return notifications
  })

  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const notif = await prisma.notification.findUnique({ where: { id: request.params.id } })
      if (!notif || notif.userId !== request.user.id) return reply.status(404).send({ error: 'Not found' })
      return prisma.notification.update({ where: { id: request.params.id }, data: { readAt: new Date() } })
    },
  )

  app.patch('/notifications/read-all', { onRequest: [app.authenticate] }, async (request) => {
    await prisma.notification.updateMany({
      where: { userId: request.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return { ok: true }
  })
}
