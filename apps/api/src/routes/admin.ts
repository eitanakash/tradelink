import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

async function adminOnly(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const user = await prisma.user.findUnique({ where: { id: (request.user as any).id }, select: { isAdmin: true } })
  if (!user?.isAdmin) return reply.code(403).send({ error: 'Admin access required' })
}

async function logAction(adminId: string, action: string, targetId?: string, targetType?: string, notes?: string) {
  await prisma.adminLog.create({ data: { adminId, action, targetId, targetType, notes } })
}

export async function adminRoutes(app: FastifyInstance) {
  // POST /admin/login
  app.post<{ Body: { email: string; password: string } }>('/admin/login', async (request, reply) => {
    const { email, password } = request.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isAdmin) return reply.code(401).send({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })
    const token = app.jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: true })
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  })

  // GET /admin/metrics
  app.get('/admin/metrics', { onRequest: [adminOnly] }, async () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, totalClients, totalContractors,
      totalJobs, totalQuotes, completedJobs, totalReviews, totalDisputes,
      weekUsers, weekJobs, weekQuotes, weekCompleted,
      monthUsers, monthJobs, monthQuotes, monthCompleted,
      jobsByStatus, jobsByCategory, topContractors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.clientProfile.count(),
      prisma.contractorProfile.count(),
      prisma.job.count(),
      prisma.quote.count(),
      prisma.job.count({ where: { status: 'COMPLETED' } }),
      prisma.review.count({ where: { deletedAt: null } }),
      prisma.dispute.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.job.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.quote.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.job.count({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.job.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.quote.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.job.count({ where: { status: 'COMPLETED', completedAt: { gte: monthAgo } } }),
      prisma.job.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.job.groupBy({ by: ['categoryId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 }),
      prisma.contractorProfile.findMany({
        where: { totalJobs: { gt: 0 } },
        select: { id: true, slug: true, averageRating: true, totalJobs: true, user: { select: { name: true } }, trades: { select: { name: true, icon: true }, take: 1 } },
        orderBy: [{ totalJobs: 'desc' }, { averageRating: 'desc' }],
        take: 5,
      }),
    ])

    // Resolve category names for jobsByCategory
    const catIds = jobsByCategory.map((j: any) => j.categoryId)
    const cats = await prisma.tradeCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    const catMap = Object.fromEntries(cats.map((c: any) => [c.id, c.name]))

    const recentActivity = await prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })

    return {
      totals: { users: totalUsers, clients: totalClients, contractors: totalContractors, jobs: totalJobs, quotes: totalQuotes, completedJobs, reviews: totalReviews, disputes: totalDisputes },
      thisWeek: { newUsers: weekUsers, newJobs: weekJobs, newQuotes: weekQuotes, completedJobs: weekCompleted },
      thisMonth: { newUsers: monthUsers, newJobs: monthJobs, newQuotes: monthQuotes, completedJobs: monthCompleted },
      jobsByStatus: jobsByStatus.map((j: any) => ({ status: j.status, count: j._count.id })),
      jobsByCategory: jobsByCategory.map((j: any) => ({ category: catMap[j.categoryId] ?? j.categoryId, count: j._count.id })),
      topContractors: topContractors.map((c: any) => ({
        name: c.user.name, slug: c.slug, totalJobs: c.totalJobs, averageRating: c.averageRating,
        category: c.trades[0] ? `${c.trades[0].icon} ${c.trades[0].name}` : '',
      })),
      recentActivity,
    }
  })

  // GET /admin/users
  app.get<{ Querystring: { q?: string; role?: string; page?: string; suspended?: string } }>('/admin/users', { onRequest: [adminOnly] }, async (request) => {
    const { q, role, suspended } = request.query
    const page = Math.max(1, parseInt(request.query.page ?? '1') || 1)
    const limit = 20

    const where: any = {}
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }]
    if (suspended === 'true') where.isSuspended = true
    if (suspended === 'false') where.isSuspended = false

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, createdAt: true, isAdmin: true, isSuspended: true, suspendedAt: true, suspendedReason: true,
          clientProfile: { select: { id: true, _count: { select: { jobs: true } } } },
          contractorProfile: { select: { id: true, isVerified: true, isFeatured: true, averageRating: true, totalJobs: true, totalReviews: true, state: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Filter by role after fetch if needed
    const filtered = role === 'client' ? users.filter((u: any) => u.clientProfile)
      : role === 'contractor' ? users.filter((u: any) => u.contractorProfile)
      : users

    return { users: filtered, total, page, limit }
  })

  // GET /admin/users/:id
  app.get<{ Params: { id: string } }>('/admin/users/:id', { onRequest: [adminOnly] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: {
        clientProfile: { include: { jobs: { include: { category: true, _count: { select: { quotes: true } } }, orderBy: { createdAt: 'desc' }, take: 10 } } },
        contractorProfile: { include: { trades: true, quotes: { include: { job: { include: { category: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }, reviews: { orderBy: { createdAt: 'desc' }, take: 5 } } },
      },
    })
    if (!user) return reply.code(404).send({ error: 'Not found' })

    const disputes = await prisma.dispute.findMany({ where: { reportedById: user.id }, orderBy: { createdAt: 'desc' }, take: 5 })
    const adminLogs = await prisma.adminLog.findMany({ where: { targetId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 })

    return { ...user, disputes, adminLogs }
  })

  // PATCH /admin/users/:id/suspend
  app.patch<{ Params: { id: string }; Body: { reason: string } }>('/admin/users/:id/suspend', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const { reason } = request.body
    const updated = await prisma.user.update({
      where: { id: request.params.id },
      data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason },
    })
    await logAction(adminId, 'USER_SUSPENDED', request.params.id, 'USER', reason)
    return updated
  })

  // PATCH /admin/users/:id/unsuspend
  app.patch<{ Params: { id: string } }>('/admin/users/:id/unsuspend', { onRequest: [adminOnly] }, async (request) => {
    const adminId = (request.user as any).id
    const updated = await prisma.user.update({
      where: { id: request.params.id },
      data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
    })
    await logAction(adminId, 'USER_UNSUSPENDED', request.params.id, 'USER')
    return updated
  })

  // POST /admin/reset-password
  app.post<{ Body: { userId: string; newPassword: string } }>('/admin/reset-password', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const { userId, newPassword } = request.body

    if (!userId || !newPassword) return reply.code(400).send({ error: 'Missing userId or newPassword' })
    if (newPassword.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'User not found' })

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
    await logAction(adminId, 'PASSWORD_RESET', userId, 'USER')
    return { ok: true }
  })

  // PATCH /admin/users/:id/verify-contractor
  app.patch<{ Params: { id: string } }>('/admin/users/:id/verify-contractor', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const user = await prisma.user.findUnique({ where: { id: request.params.id }, include: { contractorProfile: true } })
    if (!user?.contractorProfile) return reply.code(400).send({ error: 'No contractor profile' })
    await prisma.contractorProfile.update({ where: { id: user.contractorProfile.id }, data: { isVerified: true } })
    await logAction(adminId, 'CONTRACTOR_VERIFIED', request.params.id, 'USER')
    return { ok: true }
  })

  // PATCH /admin/users/:id/unverify-contractor
  app.patch<{ Params: { id: string } }>('/admin/users/:id/unverify-contractor', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const user = await prisma.user.findUnique({ where: { id: request.params.id }, include: { contractorProfile: true } })
    if (!user?.contractorProfile) return reply.code(400).send({ error: 'No contractor profile' })
    await prisma.contractorProfile.update({ where: { id: user.contractorProfile.id }, data: { isVerified: false, isFeatured: false } })
    await logAction(adminId, 'CONTRACTOR_UNVERIFIED', request.params.id, 'USER')
    return { ok: true }
  })

  // PATCH /admin/users/:id/feature-contractor
  app.patch<{ Params: { id: string } }>('/admin/users/:id/feature-contractor', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const user = await prisma.user.findUnique({ where: { id: request.params.id }, include: { contractorProfile: true } })
    if (!user?.contractorProfile) return reply.code(400).send({ error: 'No contractor profile' })
    const updated = await prisma.contractorProfile.update({
      where: { id: user.contractorProfile.id },
      data: { isFeatured: !user.contractorProfile.isFeatured },
    })
    await logAction(adminId, updated.isFeatured ? 'CONTRACTOR_FEATURED' : 'CONTRACTOR_UNFEATURED', request.params.id, 'USER')
    return updated
  })

  // GET /admin/contractors/pending
  app.get('/admin/contractors/pending', { onRequest: [adminOnly] }, async () => {
    const contractors = await prisma.contractorProfile.findMany({
      where: { isVerified: false },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true, isSuspended: true } },
        trades: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    // Get profile documents for each contractor
    const withFiles = await Promise.all(contractors.map(async (c: any) => {
      const files = await prisma.fileUpload.findMany({ where: { uploadedById: c.userId, category: 'PROFILE_DOCUMENT' } })
      return { ...c, profileFiles: files }
    }))
    return { contractors: withFiles, count: withFiles.length }
  })

  // GET /admin/contractors/verified
  app.get('/admin/contractors/verified', { onRequest: [adminOnly] }, async () => {
    const contractors = await prisma.contractorProfile.findMany({
      where: { isVerified: true },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true, isSuspended: true } },
        trades: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return contractors
  })

  // GET /admin/jobs
  app.get<{ Querystring: { q?: string; status?: string; page?: string } }>('/admin/jobs', { onRequest: [adminOnly] }, async (request) => {
    const { q, status } = request.query
    const page = Math.max(1, parseInt(request.query.page ?? '1') || 1)
    const limit = 20
    const where: any = {}
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }]
    if (status) where.status = status

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true } },
          client: { select: { user: { select: { name: true, email: true } } } },
          _count: { select: { quotes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ])
    return { jobs, total, page, limit }
  })

  // GET /admin/jobs/:id
  app.get<{ Params: { id: string } }>('/admin/jobs/:id', { onRequest: [adminOnly] }, async (request, reply) => {
    const job = await prisma.job.findUnique({
      where: { id: request.params.id },
      include: {
        category: true,
        client: { include: { user: { select: { id: true, name: true, email: true } } } },
        quotes: {
          include: {
            contractor: { include: { user: { select: { name: true, email: true } } } },
            tiers: true,
            files: true,
          },
        },
        files: true,
        review: { include: { author: { select: { name: true } } } },
        disputes: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!job) return reply.code(404).send({ error: 'Not found' })
    return job
  })

  // PATCH /admin/jobs/:id/cancel
  app.patch<{ Params: { id: string }; Body: { reason: string } }>('/admin/jobs/:id/cancel', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const { reason } = request.body
    const job = await prisma.job.findUnique({ where: { id: request.params.id } })
    if (!job) return reply.code(404).send({ error: 'Not found' })
    const updated = await prisma.job.update({ where: { id: request.params.id }, data: { status: 'CANCELLED' } })
    await logAction(adminId, 'JOB_CANCELLED', request.params.id, 'JOB', reason)
    return updated
  })

  // GET /admin/disputes
  app.get<{ Querystring: { status?: string; page?: string } }>('/admin/disputes', { onRequest: [adminOnly] }, async (request) => {
    const { status } = request.query
    const page = Math.max(1, parseInt(request.query.page ?? '1') || 1)
    const limit = 20
    const where: any = status ? { status } : {}
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          job: { select: { id: true, title: true, status: true, client: { select: { user: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ])
    return { disputes, total, page, limit }
  })

  // GET /admin/disputes/:id
  app.get<{ Params: { id: string } }>('/admin/disputes/:id', { onRequest: [adminOnly] }, async (request, reply) => {
    const dispute = await prisma.dispute.findUnique({
      where: { id: request.params.id },
      include: {
        job: {
          include: {
            category: true,
            client: { include: { user: { select: { id: true, name: true, email: true } } } },
            quotes: { where: { status: 'ACCEPTED' }, include: { contractor: { include: { user: { select: { id: true, name: true, email: true } } } } } },
          },
        },
      },
    })
    if (!dispute) return reply.code(404).send({ error: 'Not found' })
    return dispute
  })

  // PATCH /admin/disputes/:id/status
  app.patch<{ Params: { id: string }; Body: { status: string; resolution?: string } }>('/admin/disputes/:id/status', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const { status, resolution } = request.body
    const updated = await prisma.dispute.update({
      where: { id: request.params.id },
      data: {
        status: status as any,
        ...(resolution ? { resolution } : {}),
        ...(status === 'RESOLVED' ? { resolvedById: adminId, resolvedAt: new Date() } : {}),
      },
    })
    await logAction(adminId, `DISPUTE_${status}`, request.params.id, 'DISPUTE', resolution)
    return updated
  })

  // GET /admin/reviews
  app.get<{ Querystring: { filter?: string; page?: string } }>('/admin/reviews', { onRequest: [adminOnly] }, async (request) => {
    const { filter } = request.query
    const page = Math.max(1, parseInt(request.query.page ?? '1') || 1)
    const limit = 20
    const where: any = { deletedAt: null }
    if (filter === 'low') where.rating = { lte: 2 }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          author: { select: { name: true } },
          contractor: { select: { user: { select: { name: true } }, slug: true } },
          job: { select: { title: true } },
        },
        orderBy: { rating: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])
    return { reviews, total, page, limit }
  })

  // DELETE /admin/reviews/:id
  app.delete<{ Params: { id: string }; Body: { reason: string } }>('/admin/reviews/:id', { onRequest: [adminOnly] }, async (request, reply) => {
    const adminId = (request.user as any).id
    const review = await prisma.review.findUnique({ where: { id: request.params.id } })
    if (!review) return reply.code(404).send({ error: 'Not found' })

    await prisma.$transaction([
      prisma.review.update({ where: { id: request.params.id }, data: { deletedAt: new Date() } }),
      prisma.$executeRaw`
        UPDATE "ContractorProfile" SET
          "averageRating" = COALESCE((SELECT AVG(rating::numeric) FROM "Review" WHERE "contractorId" = ${review.contractorId} AND "deletedAt" IS NULL), 0),
          "totalReviews" = (SELECT COUNT(*) FROM "Review" WHERE "contractorId" = ${review.contractorId} AND "deletedAt" IS NULL)
        WHERE id = ${review.contractorId}
      `,
    ])
    await logAction(adminId, 'REVIEW_DELETED', request.params.id, 'REVIEW', request.body.reason)
    return { ok: true }
  })

  // GET /settings (public settings)
  app.get('/settings', async () => {
    const settings = await prisma.platformSetting.findMany()
    return Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  })

  // GET /admin/settings
  app.get('/admin/settings', { onRequest: [adminOnly] }, async () => {
    const settings = await prisma.platformSetting.findMany()
    return Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  })

  // PATCH /admin/settings
  app.patch<{ Body: Record<string, string> }>('/admin/settings', { onRequest: [adminOnly] }, async (request) => {
    const adminId = (request.user as any).id
    for (const [key, value] of Object.entries(request.body)) {
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }
    await logAction(adminId, 'SETTINGS_UPDATED', undefined, undefined, JSON.stringify(request.body))
    return { ok: true }
  })
}
