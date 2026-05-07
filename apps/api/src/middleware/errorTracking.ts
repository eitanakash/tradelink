import type { FastifyInstance } from 'fastify'
import { Sentry } from '../lib/sentry'

export function registerErrorTracking(app: FastifyInstance) {
  app.setErrorHandler(async (error, request, reply) => {
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message })
    }

    app.log.error({ err: error, url: request.url, method: request.method }, 'Unhandled error')

    Sentry.withScope((scope) => {
      scope.setUser({ id: (request.user as any)?.id ?? undefined })
      scope.setContext('request', { url: request.url, method: request.method, params: request.params })
      Sentry.captureException(error)
    })

    reply.status(500).send({ error: 'Internal server error' })
  })

  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection')
    Sentry.captureException(reason)
  })

  process.on('uncaughtException', (err) => {
    app.log.error({ err }, 'Uncaught exception')
    Sentry.captureException(err)
    process.exit(1)
  })
}
