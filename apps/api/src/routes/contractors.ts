import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createNotification } from '../services/notifications'

export async function contractorsRoutes(app: FastifyInstance) {
  // GET /contractors — public directory listing
  app.get<{ Querystring: { state?: string; trade?: string; page?: string; limit?: string } }>(
    '/contractors',
    async (request, _reply) => {
      const { state, trade } = request.query
      const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10) || 20))

      const contractors = await prisma.contractorProfile.findMany({
        where: {
          ...(state ? { state } : {}),
          ...(trade ? { trades: { some: { id: trade } } } : {}),
        },
        select: {
          id: true,
          slug: true,
          state: true,
          headline: true,
          bio: true,
          isVerified: true,
          isFeatured: true,
          averageRating: true,
          totalReviews: true,
          totalJobs: true,
          trades: { select: { id: true, name: true, icon: true } },
          user: { select: { name: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { averageRating: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      })

      const total = await prisma.contractorProfile.count({
        where: {
          ...(state ? { state } : {}),
          ...(trade ? { trades: { some: { id: trade } } } : {}),
        },
      })

      return { contractors, total, page, limit }
    },
  )

  // GET /contractors/:slug — public profile page
  app.get<{ Params: { slug: string } }>(
    '/contractors/:slug',
    async (request, reply) => {
      const { slug } = request.params

      const contractor = await prisma.contractorProfile.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        include: {
          user: { select: { name: true } },
          trades: { select: { id: true, name: true, icon: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              author: { select: { name: true } },
              job: { select: { title: true } },
            },
          },
        },
      })
      if (!contractor) return reply.code(404).send({ error: 'Not found' })

      const profileFiles = await prisma.fileUpload.findMany({
        where: {
          uploadedById: contractor.userId,
          category: { in: ['PROFILE_PHOTO', 'PROFILE_DOCUMENT'] },
        },
        orderBy: { createdAt: 'asc' },
      })

      const breakdown = contractor.reviews.length > 0
        ? {
            quality: contractor.reviews.reduce((s, r) => s + r.qualityRating, 0) / contractor.reviews.length,
            communication: contractor.reviews.reduce((s, r) => s + r.communicationRating, 0) / contractor.reviews.length,
            timeliness: contractor.reviews.reduce((s, r) => s + r.timelinessRating, 0) / contractor.reviews.length,
            value: contractor.reviews.reduce((s, r) => s + r.valueRating, 0) / contractor.reviews.length,
          }
        : { quality: 0, communication: 0, timeliness: 0, value: 0 }

      return { ...contractor, profileFiles, ratingBreakdown: breakdown }
    },
  )

  // POST /jobs/:id/review — client submits review after job completion
  app.post<{
    Params: { id: string }
    Body: {
      rating: number
      title: string
      body: string
      qualityRating: number
      communicationRating: number
      timelinessRating: number
      valueRating: number
    }
  }>(
    '/jobs/:id/review',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = (request.user as any).id

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          client: { select: { userId: true } },
          quotes: {
            where: { status: 'ACCEPTED' },
            select: {
              contractorId: true,
              contractor: { select: { userId: true } },
            },
          },
          review: true,
        },
      })
      if (!job) return reply.code(404).send({ error: 'Job not found' })
      if (job.client.userId !== userId) return reply.code(403).send({ error: 'Only the client can review' })
      if (job.status !== 'COMPLETED') return reply.code(400).send({ error: 'Job must be completed first' })
      if (job.review) return reply.code(400).send({ error: 'Already reviewed' })

      const acceptedQuote = job.quotes[0]
      if (!acceptedQuote) return reply.code(400).send({ error: 'No accepted quote' })

      const { rating, title, body, qualityRating, communicationRating, timelinessRating, valueRating } = request.body

      const contractorProfile = await prisma.contractorProfile.findUnique({
        where: { id: acceptedQuote.contractorId },
        select: { slug: true, userId: true },
      })

      const [review] = await prisma.$transaction([
        prisma.review.create({
          data: {
            jobId: id,
            authorId: userId,
            contractorId: acceptedQuote.contractorId,
            rating,
            title,
            body,
            qualityRating,
            communicationRating,
            timelinessRating,
            valueRating,
          },
        }),
        prisma.$executeRaw`
          UPDATE "ContractorProfile" SET
            "averageRating" = (SELECT AVG(rating::numeric) FROM "Review" WHERE "contractorId" = ${acceptedQuote.contractorId}),
            "totalReviews" = (SELECT COUNT(*) FROM "Review" WHERE "contractorId" = ${acceptedQuote.contractorId}),
            "totalJobs" = "totalJobs" + 1
          WHERE id = ${acceptedQuote.contractorId}
        `,
      ])

      if (contractorProfile?.userId) {
        await createNotification({
          userId: contractorProfile.userId,
          type: 'NEW_REVIEW',
          title: 'New Review',
          body: `You received a ${rating}-star review for "${job.title}".`,
          link: `/contractors/${contractorProfile.slug ?? acceptedQuote.contractorId}`,
        })
      }

      return review
    },
  )

  // PATCH /reviews/:id/reply — contractor replies to their review
  app.patch<{ Params: { id: string }; Body: { reply: string } }>(
    '/reviews/:id/reply',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = (request.user as any).id

      const review = await prisma.review.findUnique({
        where: { id },
        include: { contractor: { select: { userId: true } } },
      })
      if (!review) return reply.code(404).send({ error: 'Not found' })
      if (review.contractor.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

      const updated = await prisma.review.update({
        where: { id },
        data: { contractorReply: request.body.reply, contractorRepliedAt: new Date() },
      })
      return updated
    },
  )
}
