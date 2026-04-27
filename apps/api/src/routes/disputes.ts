import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function disputeRoutes(app: FastifyInstance) {
  app.post<{ Body: { jobId: string; reason: string; description: string } }>(
    '/disputes',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id
      const { jobId, reason, description } = request.body
      if (!jobId || !reason || !description) return reply.code(400).send({ error: 'All fields required' })
      const dispute = await prisma.dispute.create({
        data: { jobId, reportedById: userId, reason, description },
      })
      return reply.code(201).send(dispute)
    }
  )
}
