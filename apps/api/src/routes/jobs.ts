import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

interface PostJobBody {
  title: string
  description: string
  address: string
  city: string
  state: string
  categoryId: string
}

interface PostQuoteBody {
  amount: number
  notes: string
}

interface QuoteActionBody {
  action: 'ACCEPT' | 'REJECT'
}

interface EditJobBody {
  title?: string
  description?: string
  address?: string
  city?: string
  state?: string
  categoryId?: string
}

export async function jobRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    console.log('Getting categories')
    console.log('Getting categories')
    console.log('Getting categories')
    console.log('Getting categories')
    console.log('Getting categories')
    return prisma.tradeCategory.findMany({ orderBy: { name: 'asc' } })
  })

  app.post<{ Body: PostJobBody }>(
    '/jobs',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { title, description, address, city, state, categoryId } = request.body

      if (!title || !description || !address || !city || !state || !categoryId) {
        return reply.status(400).send({ error: 'All fields are required' })
      }

      const client = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!client) {
        return reply.status(403).send({ error: 'Client profile required' })
      }

      const job = await prisma.job.create({
        data: { title, description, address, city, state, categoryId, clientId: client.id },
        include: { category: true, _count: { select: { quotes: true } } },
      })
      return reply.status(201).send(job)
    },
  )

  app.get<{ Querystring: { mode?: string } }>(
    '/jobs',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { mode } = request.query

      if (mode === 'CLIENT') {
        const client = await prisma.clientProfile.findUnique({
          where: { userId: request.user.id },
        })
        if (!client) return reply.status(403).send({ error: 'Client profile required' })

        const jobs = await prisma.job.findMany({
          where: { clientId: client.id },
          include: { category: true, _count: { select: { quotes: true } } },
          orderBy: { createdAt: 'desc' },
        })
        return jobs
      }

      if (mode === 'CONTRACTOR') {
        const contractor = await prisma.contractorProfile.findUnique({
          where: { userId: request.user.id },
          include: { trades: { select: { id: true } } },
        })
        if (!contractor) return reply.status(403).send({ error: 'Contractor profile required' })

        const tradeCategoryIds = contractor.trades.map((t) => t.id)

        const jobs = await prisma.job.findMany({
          where: {
            state: contractor.state,
            status: 'OPEN',
            ...(tradeCategoryIds.length > 0 ? { categoryId: { in: tradeCategoryIds } } : {}),
          },
          include: {
            category: true,
            _count: { select: { quotes: true } },
            client: { select: { user: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        })
        return jobs
      }

      return reply.status(400).send({ error: 'mode param required (CLIENT or CONTRACTOR)' })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const job = await prisma.job.findUnique({
        where: { id: request.params.id },
        include: {
          category: true,
          client: { select: { user: { select: { name: true } } } },
          files: { orderBy: { createdAt: 'asc' } },
          quotes: {
            include: {
              contractor: { select: { user: { select: { name: true } } } },
              files: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (!job) return reply.status(404).send({ error: 'Job not found' })

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      const isOwner = clientProfile?.id === job.clientId

      if (!isOwner) {
        const contractor = await prisma.contractorProfile.findUnique({
          where: { userId: request.user.id },
        })
        if (!contractor) return reply.status(403).send({ error: 'Access denied' })
        return { ...job, quotes: job.quotes.filter((q) => q.contractorId === contractor.id) }
      }

      return job
    },
  )

  app.post<{ Params: { id: string }; Body: PostQuoteBody }>(
    '/jobs/:id/quotes',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { amount, notes } = request.body

      if (!amount || !notes) {
        return reply.status(400).send({ error: 'Amount and notes are required' })
      }

      const contractor = await prisma.contractorProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!contractor) return reply.status(403).send({ error: 'Contractor profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.status !== 'OPEN') {
        return reply.status(400).send({ error: 'Job is not open for quotes' })
      }

      const existing = await prisma.quote.findFirst({
        where: { jobId: job.id, contractorId: contractor.id },
      })
      if (existing) return reply.status(409).send({ error: 'You already submitted a quote' })

      const quote = await prisma.quote.create({
        data: { amount, notes, jobId: job.id, contractorId: contractor.id },
      })

      await prisma.job.update({ where: { id: job.id }, data: { status: 'IN_REVIEW' } })

      return reply.status(201).send(quote)
    },
  )

  app.patch<{ Params: { id: string }; Body: EditJobBody }>(
    '/jobs/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const client = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!client) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.clientId !== client.id) return reply.status(403).send({ error: 'Access denied' })
      if (!['OPEN', 'IN_REVIEW'].includes(job.status)) {
        return reply.status(400).send({ error: 'Only open or in-review jobs can be edited' })
      }

      const { title, description, address, city, state, categoryId } = request.body
      const updated = await prisma.job.update({
        where: { id: job.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(city !== undefined ? { city } : {}),
          ...(state !== undefined ? { state } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
        },
        include: { category: true, _count: { select: { quotes: true } } },
      })
      return updated
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/jobs/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const client = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!client) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.clientId !== client.id) return reply.status(403).send({ error: 'Access denied' })
      if (!['OPEN', 'IN_REVIEW'].includes(job.status)) {
        return reply.status(400).send({ error: 'Only open or in-review jobs can be deleted' })
      }

      await prisma.$transaction([
        prisma.quote.deleteMany({ where: { jobId: job.id } }),
        prisma.job.delete({ where: { id: job.id } }),
      ])
      return reply.status(204).send()
    },
  )

  app.patch<{ Params: { id: string; quoteId: string }; Body: QuoteActionBody }>(
    '/jobs/:id/quotes/:quoteId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { action } = request.body
      if (!['ACCEPT', 'REJECT'].includes(action)) {
        return reply.status(400).send({ error: 'action must be ACCEPT or REJECT' })
      }

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.clientId !== clientProfile.id) return reply.status(403).send({ error: 'Access denied' })

      const quote = await prisma.quote.findUnique({ where: { id: request.params.quoteId } })
      if (!quote || quote.jobId !== job.id) return reply.status(404).send({ error: 'Quote not found' })

      if (action === 'ACCEPT') {
        await prisma.$transaction([
          prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } }),
          prisma.quote.updateMany({
            where: { jobId: job.id, id: { not: quote.id } },
            data: { status: 'REJECTED' },
          }),
          prisma.job.update({ where: { id: job.id }, data: { status: 'AWARDED' } }),
        ])
      } else {
        await prisma.quote.update({ where: { id: quote.id }, data: { status: 'REJECTED' } })
      }

      const updated = await prisma.quote.findUnique({ where: { id: quote.id } })
      return updated
    },
  )
}
