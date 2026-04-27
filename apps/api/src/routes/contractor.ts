import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

interface UpdateProfileBody {
  bio?: string
  headline?: string
  yearsExperience?: number
  website?: string
  phone?: string
  tradeIds?: string[]
}

export async function contractorRoutes(app: FastifyInstance) {
  app.get(
    '/contractor/profile',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { userId: request.user.id },
        include: { trades: { select: { id: true, name: true, icon: true } } },
      })
      if (!contractor) return reply.status(404).send({ error: 'Contractor profile not found' })

      const profileFiles = await prisma.fileUpload.findMany({
        where: {
          uploadedById: request.user.id,
          category: { in: ['PROFILE_PHOTO', 'PROFILE_DOCUMENT'] },
        },
        orderBy: { createdAt: 'asc' },
      })

      return { ...contractor, profileFiles }
    },
  )

  app.get(
    '/contractor/quotes',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!contractor) return reply.status(404).send({ error: 'Contractor profile not found' })

      const quotes = await prisma.quote.findMany({
        where: { contractorId: contractor.id },
        include: {
          job: { include: { category: true } },
          tiers: { orderBy: { createdAt: 'asc' } },
          questions: { orderBy: { createdAt: 'asc' } },
          files: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return quotes
    },
  )

  app.delete<{ Params: { quoteId: string } }>(
    '/contractor/quotes/:quoteId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!contractor) return reply.status(403).send({ error: 'Contractor profile required' })

      const quote = await prisma.quote.findUnique({ where: { id: request.params.quoteId } })
      if (!quote || quote.contractorId !== contractor.id) {
        return reply.status(404).send({ error: 'Quote not found' })
      }
      if (quote.status !== 'PENDING') {
        return reply.status(400).send({ error: 'Only pending quotes can be withdrawn' })
      }

      await prisma.quote.delete({ where: { id: quote.id } })

      const remaining = await prisma.quote.count({ where: { jobId: quote.jobId } })
      if (remaining === 0) {
        await prisma.job.update({ where: { id: quote.jobId }, data: { status: 'OPEN' } })
      }

      return reply.status(204).send()
    },
  )

  app.patch<{ Body: UpdateProfileBody }>(
    '/contractor/profile',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { bio, tradeIds } = request.body

      const contractor = await prisma.contractorProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!contractor) return reply.status(404).send({ error: 'Contractor profile not found' })

      const updated = await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          ...(bio !== undefined ? { bio } : {}),
          ...(tradeIds !== undefined
            ? { trades: { set: tradeIds.map((id) => ({ id })) } }
            : {}),
        },
        include: { trades: { select: { id: true, name: true, icon: true } } },
      })
      return updated
    },
  )
}
