import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { anthropic } from '../lib/anthropic'
import { createNotification } from '../services/notifications'
import { wsManager } from '../services/websocket'
import { notifyNewQuote, notifyQuoteAccepted, notifyQuoteRejected, notifyNewJobInArea } from '../services/email'

interface PostJobBody {
  title: string
  description: string
  address: string
  city: string
  state: string
  categoryId: string
}

interface TierInput {
  name: string
  price: number
  description: string
  duration: string
  inclusions: string[]
  exclusions: string[]
  warranty?: string
}

interface QuestionInput {
  question: string
}

interface PostQuoteBody {
  coverLetter: string
  tiers: TierInput[]
  questions?: QuestionInput[]
  fileIds?: string[]
}

interface EditJobBody {
  title?: string
  description?: string
  address?: string
  city?: string
  state?: string
  categoryId?: string
}

interface AnswerQuestionBody {
  questionId: string
  answer: string
}

interface AcceptQuoteBody {
  tierId: string
}

interface CompareQuotesBody {
  followUp?: string
}

const QUOTE_INCLUDE = {
  contractor: {
    select: {
      id: true,
      slug: true,
      isVerified: true,
      averageRating: true,
      totalReviews: true,
      totalJobs: true,
      user: { select: { name: true } },
      trades: { select: { id: true, name: true, icon: true } },
    },
  },
  tiers: { orderBy: { createdAt: 'asc' as const } },
  questions: { orderBy: { createdAt: 'asc' as const } },
  files: { orderBy: { createdAt: 'asc' as const } },
}

export async function jobRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
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
      const client = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!client) return reply.status(403).send({ error: 'Client profile required' })
      const job = await prisma.job.create({
        data: { title, description, address, city, state, categoryId, clientId: client.id },
        include: { category: true, _count: { select: { quotes: true } } },
      })

      // Notify matching contractors
      try {
        const categoryRecord = await prisma.tradeCategory.findUnique({ where: { id: job.categoryId } })
        const matchingContractors = await prisma.contractorProfile.findMany({
          where: { state: job.state, trades: { some: { id: job.categoryId } } },
          include: { user: true },
        })
        for (const cp of matchingContractors) {
          createNotification({
            userId: cp.userId,
            type: 'NEW_JOB_IN_AREA',
            title: `New ${categoryRecord?.name ?? 'trade'} job in ${job.city}`,
            body: job.title,
            link: `/jobs/${job.id}`,
            emailFn: () => notifyNewJobInArea(cp.userId, {
              contractorName: cp.user.name,
              jobTitle: job.title,
              category: categoryRecord?.name ?? 'trade',
              city: job.city,
            }),
          }).catch(() => {})
          wsManager.send(cp.userId, 'JOB_STATUS_CHANGED', { jobId: job.id })
        }
      } catch {}

      return reply.status(201).send(job)
    },
  )

  app.get<{ Querystring: { mode?: string } }>(
    '/jobs',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { mode } = request.query
      if (mode === 'CLIENT') {
        const client = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
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
        if (!contractor.isVerified) return reply.status(403).send({ error: 'VERIFICATION_REQUIRED', message: 'Contractor verification required to view jobs' })
        const tradeCategoryIds = contractor.trades.map((t) => t.id)
        const jobs = await prisma.job.findMany({
          where: {
            state: contractor.state,
            status: 'OPEN',
            categoryId: { in: tradeCategoryIds },
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
            include: QUOTE_INCLUDE,
            orderBy: { createdAt: 'asc' },
          },
          review: {
            select: {
              id: true, rating: true, title: true, body: true,
              qualityRating: true, communicationRating: true, timelinessRating: true, valueRating: true,
              contractorReply: true, contractorRepliedAt: true, isVerified: true, createdAt: true,
              authorId: true, contractorId: true, jobId: true,
              author: { select: { name: true } },
              job: { select: { title: true } },
            },
          },
        },
      })
      if (!job) return reply.status(404).send({ error: 'Job not found' })

      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      const isOwner = clientProfile?.id === job.clientId

      if (!isOwner) {
        const contractor = await prisma.contractorProfile.findUnique({ where: { userId: request.user.id } })
        if (!contractor || !contractor.isVerified) return reply.status(403).send({ error: 'VERIFICATION_REQUIRED', message: 'Contractor verification required' })
        return { ...job, quotes: job.quotes.filter((q) => q.contractorId === contractor.id) }
      }
      return job
    },
  )

  // POST /jobs/:id/quotes — contractor submits a rich quote
  app.post<{ Params: { id: string }; Body: PostQuoteBody }>(
    '/jobs/:id/quotes',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { coverLetter, tiers, questions = [], fileIds = [] } = request.body

      if (!coverLetter || coverLetter.trim().length < 10) {
        return reply.status(400).send({ error: 'Cover letter is required (minimum 10 characters)' })
      }
      if (!tiers || tiers.length === 0) {
        return reply.status(400).send({ error: 'At least one pricing tier is required' })
      }
      if (tiers.length > 3) {
        return reply.status(400).send({ error: 'Maximum 3 tiers allowed' })
      }

      const contractor = await prisma.contractorProfile.findUnique({ where: { userId: request.user.id } })
      if (!contractor) return reply.status(403).send({ error: 'Contractor profile required' })
      if (!contractor.isVerified) return reply.status(403).send({ error: 'VERIFICATION_REQUIRED', message: 'Your contractor profile must be verified by an administrator to submit quotes' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.status !== 'OPEN') return reply.status(400).send({ error: 'Job is not open for quotes' })

      const existing = await prisma.quote.findFirst({ where: { jobId: job.id, contractorId: contractor.id } })
      if (existing) return reply.status(409).send({ error: 'You already submitted a quote for this job' })

      const quote = await prisma.quote.create({
        data: {
          coverLetter: coverLetter.trim(),
          jobId: job.id,
          contractorId: contractor.id,
          tiers: {
            create: tiers.map((t) => ({
              name: t.name,
              price: t.price,
              description: t.description,
              duration: t.duration,
              inclusions: t.inclusions ?? [],
              exclusions: t.exclusions ?? [],
              warranty: t.warranty ?? null,
            })),
          },
          questions: {
            create: questions.filter((q) => q.question.trim()).map((q) => ({ question: q.question.trim() })),
          },
        },
        include: QUOTE_INCLUDE,
      })

      // Link uploaded files to this quote
      if (fileIds.length > 0) {
        await prisma.fileUpload.updateMany({
          where: { id: { in: fileIds }, uploadedById: request.user.id },
          data: { quoteId: quote.id },
        })
      }

      await prisma.job.update({ where: { id: job.id }, data: { status: 'IN_REVIEW' } })

      // Notify client
      try {
        const clientWithUser = await prisma.clientProfile.findUnique({
          where: { id: job.clientId },
          include: { user: true },
        })
        const contractorWithUser = await prisma.contractorProfile.findUnique({
          where: { id: contractor.id },
          include: { user: true },
        })
        if (clientWithUser) {
          createNotification({
            userId: clientWithUser.userId,
            type: 'NEW_QUOTE',
            title: 'New quote received',
            body: `${contractorWithUser?.user.name ?? 'A contractor'} submitted a quote for "${job.title}"`,
            link: `/jobs/${job.id}`,
            emailFn: () => notifyNewQuote(clientWithUser.userId, {
              clientName: clientWithUser.user.name,
              contractorName: contractorWithUser?.user.name ?? 'A contractor',
              jobTitle: job.title,
            }),
          }).catch(() => {})
          wsManager.send(clientWithUser.userId, 'QUOTE_SUBMITTED', { jobId: job.id })
        }
      } catch {}

      return reply.status(201).send(quote)
    },
  )

  // PATCH /jobs/:id/quotes/:quoteId/answer — client answers a contractor question
  app.patch<{ Params: { id: string; quoteId: string }; Body: AnswerQuestionBody }>(
    '/jobs/:id/quotes/:quoteId/answer',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { questionId, answer } = request.body
      if (!questionId || !answer) return reply.status(400).send({ error: 'questionId and answer are required' })

      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job || job.clientId !== clientProfile.id) return reply.status(403).send({ error: 'Access denied' })

      const question = await prisma.quoteQuestion.findUnique({ where: { id: questionId } })
      if (!question || question.quoteId !== request.params.quoteId) {
        return reply.status(404).send({ error: 'Question not found' })
      }

      const updated = await prisma.quoteQuestion.update({
        where: { id: questionId },
        data: { answer: answer.trim() },
      })

      // Notify contractor
      try {
        const quoteRecord = await prisma.quote.findUnique({
          where: { id: request.params.quoteId },
          include: { contractor: { include: { user: true } } },
        })
        if (quoteRecord) {
          createNotification({
            userId: quoteRecord.contractor.userId,
            type: 'QUESTION_ANSWERED',
            title: 'Client answered your question',
            body: answer.trim().slice(0, 100),
            link: `/jobs/${request.params.id}`,
          }).catch(() => {})
        }
      } catch {}

      return updated
    },
  )

  // PATCH /jobs/:id/quotes/:quoteId/accept — client accepts a quote with a specific tier
  app.patch<{ Params: { id: string; quoteId: string }; Body: AcceptQuoteBody }>(
    '/jobs/:id/quotes/:quoteId/accept',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { tierId } = request.body
      if (!tierId) return reply.status(400).send({ error: 'tierId is required' })

      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job || job.clientId !== clientProfile.id) return reply.status(403).send({ error: 'Access denied' })

      const quote = await prisma.quote.findUnique({
        where: { id: request.params.quoteId },
        include: { tiers: true },
      })
      if (!quote || quote.jobId !== job.id) return reply.status(404).send({ error: 'Quote not found' })
      if (!quote.tiers.find((t) => t.id === tierId)) return reply.status(400).send({ error: 'Tier not found on this quote' })

      await prisma.$transaction([
        prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } }),
        prisma.quote.updateMany({ where: { jobId: job.id, id: { not: quote.id } }, data: { status: 'REJECTED' } }),
        prisma.job.update({ where: { id: job.id }, data: { status: 'AWARDED' } }),
      ])

      // Notify accepted contractor
      try {
        const acceptedContractorWithUser = await prisma.contractorProfile.findUnique({
          where: { id: quote.contractorId },
          include: { user: true },
        })
        const clientWithUser = await prisma.clientProfile.findUnique({
          where: { id: job.clientId },
          include: { user: true },
        })
        if (acceptedContractorWithUser && clientWithUser) {
          createNotification({
            userId: acceptedContractorWithUser.userId,
            type: 'QUOTE_ACCEPTED',
            title: 'Your quote was accepted! 🎉',
            body: `${clientWithUser.user.name} accepted your quote for "${job.title}"`,
            link: `/jobs/${job.id}`,
            emailFn: () => notifyQuoteAccepted(acceptedContractorWithUser.userId, {
              contractorName: acceptedContractorWithUser.user.name,
              clientName: clientWithUser.user.name,
              jobTitle: job.title,
            }),
          }).catch(() => {})
          wsManager.send(acceptedContractorWithUser.userId, 'JOB_STATUS_CHANGED', { jobId: job.id })
        }
        // Notify rejected contractors
        const rejectedQuotes = await prisma.quote.findMany({
          where: { jobId: job.id, id: { not: quote.id } },
          include: { contractor: { include: { user: true } } },
        })
        for (const rq of rejectedQuotes) {
          createNotification({
            userId: rq.contractor.userId,
            type: 'QUOTE_REJECTED',
            title: 'Quote not selected',
            body: `Another contractor was chosen for "${job.title}"`,
            emailFn: () => notifyQuoteRejected(rq.contractor.userId, {
              contractorName: rq.contractor.user.name,
              jobTitle: job.title,
            }),
          }).catch(() => {})
        }
      } catch {}

      const updated = await prisma.quote.findUnique({ where: { id: quote.id }, include: QUOTE_INCLUDE })
      return updated
    },
  )

  // PATCH /jobs/:id/quotes/:quoteId/reject — client rejects a quote
  app.patch<{ Params: { id: string; quoteId: string } }>(
    '/jobs/:id/quotes/:quoteId/reject',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job || job.clientId !== clientProfile.id) return reply.status(403).send({ error: 'Access denied' })

      const quote = await prisma.quote.findUnique({ where: { id: request.params.quoteId } })
      if (!quote || quote.jobId !== job.id) return reply.status(404).send({ error: 'Quote not found' })

      const updated = await prisma.quote.update({ where: { id: quote.id }, data: { status: 'REJECTED' } })
      return updated
    },
  )

  // POST /jobs/:id/quotes/compare — AI analysis of all quotes
  app.post<{ Params: { id: string }; Body: CompareQuotesBody }>(
    '/jobs/:id/quotes/compare',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const job = await prisma.job.findUnique({
        where: { id: request.params.id },
        include: {
          category: true,
          quotes: {
            where: { status: { not: 'REJECTED' } },
            include: QUOTE_INCLUDE,
          },
        },
      })
      if (!job || job.clientId !== clientProfile.id) return reply.status(403).send({ error: 'Access denied' })
      if (job.quotes.length === 0) return reply.status(400).send({ error: 'No quotes to compare' })

      const jobContext = `Job: ${job.title}\nCategory: ${job.category.name}\nLocation: ${job.city}, ${job.state}\nDescription: ${job.description}`

      const quotesContext = job.quotes.map((q, i) => {
        const tiersText = q.tiers.map((t) =>
          `  - ${t.name}: $${t.price}, ${t.duration}\n    Includes: ${t.inclusions.join(', ') || 'N/A'}\n    Excludes: ${t.exclusions.join(', ') || 'N/A'}${t.warranty ? `\n    Warranty: ${t.warranty}` : ''}`
        ).join('\n')
        return `Quote ${i + 1} from ${q.contractor?.user.name ?? 'Contractor'}:\nCover letter: ${q.coverLetter}\nTiers:\n${tiersText}`
      }).join('\n\n')

      const userMessage = `Please analyze and compare these contractor quotes for my job.\n\n${jobContext}\n\n${quotesContext}${request.body.followUp ? `\n\nAdditional question: ${request.body.followUp}` : ''}`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: 'You are a helpful home improvement advisor helping a homeowner understand and compare contractor quotes. Be honest, clear and unbiased. Explain pricing differences, what to watch out for, what questions to ask. Use simple language, no jargon. Point out if something seems too cheap or suspiciously expensive. Highlight the best value option but respect that the client may have other priorities. Format your response with clear sections using markdown headers.',
        messages: [{ role: 'user', content: userMessage }],
      })

      const analysis = response.content.find((b) => b.type === 'text')?.text ?? ''
      return { analysis }
    },
  )

  app.patch<{ Params: { id: string }; Body: EditJobBody }>(
    '/jobs/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const client = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
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
      const client = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
      if (!client) return reply.status(403).send({ error: 'Client profile required' })
      const job = await prisma.job.findUnique({ where: { id: request.params.id } })
      if (!job) return reply.status(404).send({ error: 'Job not found' })
      if (job.clientId !== client.id) return reply.status(403).send({ error: 'Access denied' })
      if (!['OPEN', 'IN_REVIEW'].includes(job.status)) {
        return reply.status(400).send({ error: 'Only open or in-review jobs can be deleted' })
      }
      // Delete quotes first (cascade handles tiers/questions), then job
      await prisma.$transaction([
        prisma.quote.deleteMany({ where: { jobId: job.id } }),
        prisma.job.delete({ where: { id: job.id } }),
      ])
      return reply.status(204).send()
    },
  )

  // POST /jobs/:id/complete — client or contractor marks job as complete
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/complete',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = request.user.id

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          client: { select: { userId: true, id: true } },
          quotes: { where: { status: 'ACCEPTED' }, select: { contractorId: true, contractor: { select: { userId: true, id: true } } } },
        },
      })
      if (!job) return reply.code(404).send({ error: 'Job not found' })
      if (job.status === 'COMPLETED') return reply.send({ message: 'Already completed' })

      const isClient = job.client.userId === userId
      const acceptedQuote = job.quotes[0]
      const isContractor = acceptedQuote?.contractor?.userId === userId

      if (!isClient && !isContractor) return reply.code(403).send({ error: 'Forbidden' })

      const update: any = {}
      if (isClient) update.clientMarkedComplete = true
      if (isContractor) update.contractorMarkedComplete = true

      const newClientFlag = isClient ? true : job.clientMarkedComplete
      const newContractorFlag = isContractor ? true : job.contractorMarkedComplete

      if (newClientFlag && newContractorFlag) {
        update.status = 'COMPLETED'
        update.completedAt = new Date()
      }

      const updated = await prisma.job.update({ where: { id }, data: update })

      if (updated.status === 'COMPLETED') {
        const clientUserId = job.client.userId
        const contractorUserId = acceptedQuote?.contractor?.userId
        if (clientUserId) {
          await createNotification({ userId: clientUserId, type: 'JOB_COMPLETED', title: 'Job Completed', body: `"${job.title}" has been marked as complete.`, link: `/jobs/${id}` })
        }
        if (contractorUserId) {
          await createNotification({ userId: contractorUserId, type: 'JOB_COMPLETED', title: 'Job Completed', body: `"${job.title}" has been marked as complete.`, link: `/jobs/${id}` })
        }
      }

      return updated
    },
  )
}
