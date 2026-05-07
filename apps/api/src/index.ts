import './types'
import { initSentry } from './lib/sentry'
initSentry()
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { redis } from './lib/redis'
import { prisma } from './lib/prisma'
import { authRoutes } from './routes/auth'
import { jobRoutes } from './routes/jobs'
import { contractorRoutes } from './routes/contractor'
import { contractorsRoutes } from './routes/contractors'
import { aiRoutes } from './routes/ai'
import { uploadRoutes } from './routes/uploads'
import { conversationRoutes } from './routes/conversations'
import { notificationRoutes } from './routes/notifications'
import { accountRoutes } from './routes/account'
import { adminRoutes } from './routes/admin'
import { registerErrorTracking } from './middleware/errorTracking'

const isProd = process.env.NODE_ENV === 'production'

const app = Fastify({
  logger: isProd
    ? { level: 'info' }
    : { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } },
  bodyLimit: 4 * 1024 * 1024,
})

app.register(websocket)
app.register(helmet, { contentSecurityPolicy: false })

app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  redis,
  keyGenerator: (req: FastifyRequest) => req.ip,
})

const corsOrigins = isProd
  ? [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean) as string[]
  : ['http://localhost:5173', 'http://localhost:5174']

app.register(cors, { origin: corsOrigins })
app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'changeme-set-jwt-secret-in-env',
})

app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

app.get('/health', async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.npm_package_version,
    })
  } catch (err) {
    return reply.status(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Health check failed',
    })
  }
})

app.register(authRoutes)
app.register(jobRoutes)
app.register(contractorRoutes)
app.register(contractorsRoutes)
app.register(aiRoutes)
app.register(uploadRoutes)
app.register(conversationRoutes)
app.register(notificationRoutes)
app.register(accountRoutes)
app.register(adminRoutes)

registerErrorTracking(app)

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
