import type { FastifyInstance } from 'fastify'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const isProd = process.env.NODE_ENV === 'production'

export function registerErrorTracking(app: FastifyInstance) {
  app.setErrorHandler(async (error, request, reply) => {
    const context = {
      url: request.url,
      method: request.method,
      userId: (request.user as any)?.id ?? null,
      params: request.params,
      statusCode: error.statusCode ?? 500,
      message: error.message,
      stack: error.stack,
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message })
    }

    app.log.error({ err: error, context }, 'Unhandled error')

    if (isProd && resend && ADMIN_EMAIL) {
      resend.emails.send({
        from: process.env.EMAIL_FROM ?? `errors@travajos.com`,
        to: ADMIN_EMAIL,
        subject: `[${APP_URL}] Server Error: ${error.message}`,
        html: `<pre style="font-family:monospace;font-size:13px">${JSON.stringify(context, null, 2)}</pre>`,
      }).catch(() => {})
    }

    reply.status(500).send({ error: 'Internal server error' })
  })

  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection')
  })

  process.on('uncaughtException', (err) => {
    app.log.error({ err }, 'Uncaught exception')
    process.exit(1)
  })
}
