import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { uploadFile, deleteFile } from '../services/storage'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'application/pdf',
])

const SIZE_LIMITS: Record<string, number> = {
  'image/': 10 * 1024 * 1024,
  'video/': 50 * 1024 * 1024,
  'application/pdf': 20 * 1024 * 1024,
}

const CATEGORY_FOLDERS: Record<string, string> = {
  JOB_PHOTO: 'jobs',
  JOB_VIDEO: 'jobs',
  JOB_DOCUMENT: 'jobs',
  QUOTE_PHOTO: 'quotes',
  QUOTE_DOCUMENT: 'quotes',
  PROFILE_PHOTO: 'profiles',
  PROFILE_DOCUMENT: 'profiles',
}

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_FOLDERS))

function getSizeLimit(mimeType: string): number {
  if (mimeType.startsWith('video/')) return SIZE_LIMITS['video/']
  if (mimeType.startsWith('image/')) return SIZE_LIMITS['image/']
  return SIZE_LIMITS['application/pdf']
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    '/uploads',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const fields: Record<string, string> = {}
      let fileBuffer: Buffer | null = null
      let filename = ''
      let mimeType = ''

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          const chunks: Buffer[] = []
          for await (const chunk of part.file) chunks.push(chunk)
          fileBuffer = Buffer.concat(chunks)
          filename = part.filename
          mimeType = part.mimetype
        } else {
          fields[part.fieldname] = part.value as string
        }
      }

      if (!fileBuffer || !filename) {
        return reply.status(400).send({ error: 'No file provided' })
      }

      const { category, jobId, quoteId, sessionId } = fields

      if (!category || !VALID_CATEGORIES.has(category)) {
        return reply.status(400).send({ error: 'Valid category is required' })
      }

      if (!ALLOWED_TYPES.has(mimeType)) {
        return reply.status(400).send({
          error: 'File type not allowed. Supported: JPEG, PNG, WebP, HEIC, MP4, MOV, AVI, PDF',
        })
      }

      const sizeLimit = getSizeLimit(mimeType)
      if (fileBuffer.length > sizeLimit) {
        const limitMB = Math.round(sizeLimit / 1024 / 1024)
        return reply.status(400).send({ error: `File too large. Max size for this type is ${limitMB}MB` })
      }

      const folder = CATEGORY_FOLDERS[category]
      const { url, key } = await uploadFile(fileBuffer, filename, mimeType, folder)

      const record = await prisma.fileUpload.create({
        data: {
          url,
          key,
          filename,
          mimeType,
          size: fileBuffer.length,
          category: category as any,
          uploadedById: request.user.id,
          ...(jobId ? { jobId } : {}),
          ...(quoteId ? { quoteId } : {}),
          ...(sessionId ? { sessionId } : {}),
        },
      })

      return reply.status(201).send({
        id: record.id,
        url: record.url,
        filename: record.filename,
        mimeType: record.mimeType,
        size: record.size,
        category: record.category,
      })
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/uploads/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const record = await prisma.fileUpload.findUnique({ where: { id: request.params.id } })
      if (!record) return reply.status(404).send({ error: 'File not found' })
      if (record.uploadedById !== request.user.id) {
        return reply.status(403).send({ error: 'Access denied' })
      }

      await deleteFile(record.key)
      await prisma.fileUpload.delete({ where: { id: record.id } })
      return reply.status(204).send()
    },
  )
}
