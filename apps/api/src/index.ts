import './types'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { HealthResponse } from '@tradelink/types'
import { authRoutes } from './routes/auth'
import { jobRoutes } from './routes/jobs'
import { contractorRoutes } from './routes/contractor'
import { contractorsRoutes } from './routes/contractors'
import { aiRoutes } from './routes/ai'
import { uploadRoutes } from './routes/uploads'
import { conversationRoutes } from './routes/conversations'
import { notificationRoutes } from './routes/notifications'
import { adminRoutes } from './routes/admin'
import { disputeRoutes } from './routes/disputes'

const app = Fastify({ logger: true, bodyLimit: 4 * 1024 * 1024 })

app.register(websocket)

app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
})

app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
})

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

app.get<{ Reply: HealthResponse }>('/health', async () => {
  return { status: 'ok' }
})

app.register(authRoutes)
app.register(jobRoutes)
app.register(contractorRoutes)
app.register(contractorsRoutes)
app.register(aiRoutes)
app.register(uploadRoutes)
app.register(conversationRoutes)
app.register(notificationRoutes)
app.register(adminRoutes)
app.register(disputeRoutes)

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
