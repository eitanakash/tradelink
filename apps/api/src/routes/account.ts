import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { uploadFile, deleteFile } from '../services/storage'

const EMAIL_CHANGE_TTL = 86400 // 24 hours

const accountSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  zipCode: true,
  createdAt: true,
  updatedAt: true,
  clientProfile: { select: { id: true } },
  contractorProfile: { select: { id: true } },
} as const

function extractStorageKey(url: string): string | null {
  try {
    const match = url.match(/(?:avatars|uploads)\/[^?#]+/)
    return match ? match[0] : null
  } catch {
    return null
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM || 'Tradelink <noreply@tradelink.app>'
  await resend.emails.send({ from: FROM, to, subject, html }).catch(() => {})
}

export async function accountRoutes(app: FastifyInstance) {
  // GET /account/me
  app.get('/account/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: accountSelect,
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  // PATCH /account/me
  app.patch<{
    Body: {
      firstName?: string
      lastName?: string
      phone?: string | null
      addressLine1?: string | null
      addressLine2?: string | null
      city?: string | null
      state?: string | null
      country?: string | null
      zipCode?: string | null
    }
  }>('/account/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = request.body

    if (body.firstName !== undefined && body.firstName.trim().length < 2) {
      return reply.status(400).send({ error: 'First name must be at least 2 characters' })
    }
    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      if (!/^[+\d\s\-().]{7,20}$/.test(body.phone)) {
        return reply.status(400).send({ error: 'Invalid phone number format' })
      }
    }

    const fields = [
      'firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2',
      'city', 'state', 'country', 'zipCode',
    ] as const

    const data: Record<string, string | null> = {}
    for (const f of fields) {
      if (f in body) data[f] = (body as any)[f] ?? null
    }

    if ('firstName' in data || 'lastName' in data) {
      const current = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { firstName: true, lastName: true },
      })
      const first = ('firstName' in data ? data.firstName : current?.firstName) ?? ''
      const last = ('lastName' in data ? data.lastName : current?.lastName) ?? ''
      data.name = [first, last].filter(Boolean).join(' ')
    }

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data,
      select: accountSelect,
    })
    return user
  })

  // POST /account/avatar
  app.post('/account/avatar', { onRequest: [app.authenticate] }, async (request, reply) => {
    const file = await request.file()
    if (!file) return reply.status(400).send({ error: 'No file provided' })

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.mimetype)) {
      return reply.status(400).send({ error: 'Only JPEG, PNG, WebP or GIF images are allowed' })
    }

    const current = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { avatar: true },
    })
    if (current?.avatar) {
      const key = extractStorageKey(current.avatar)
      if (key) await deleteFile(key).catch(() => {})
    }

    const buffer = await file.toBuffer()
    const { url } = await uploadFile(buffer, file.filename, file.mimetype, 'avatars')

    await prisma.user.update({ where: { id: request.user.id }, data: { avatar: url } })
    return { avatar: url }
  })

  // DELETE /account/avatar
  app.delete('/account/avatar', { onRequest: [app.authenticate] }, async (request, reply) => {
    const current = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { avatar: true },
    })
    if (!current?.avatar) return reply.status(404).send({ error: 'No avatar to delete' })

    const key = extractStorageKey(current.avatar)
    if (key) await deleteFile(key).catch(() => {})

    await prisma.user.update({ where: { id: request.user.id }, data: { avatar: null } })
    return { success: true }
  })

  // POST /account/change-email
  app.post<{ Body: { password: string; newEmail: string } }>(
    '/account/change-email',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { password, newEmail } = request.body
      if (!password || !newEmail) {
        return reply.status(400).send({ error: 'Password and new email are required' })
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return reply.status(400).send({ error: 'Invalid email address' })
      }

      const user = await prisma.user.findUnique({ where: { id: request.user.id } })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) return reply.status(401).send({ error: 'Incorrect password' })

      const existing = await prisma.user.findUnique({ where: { email: newEmail } })
      if (existing) return reply.status(409).send({ error: 'Email already in use' })

      const token = randomBytes(32).toString('hex')
      await redis.set(
        `email_change:${token}`,
        JSON.stringify({ userId: user.id, newEmail }),
        'EX',
        EMAIL_CHANGE_TTL,
      )

      const APP_URL = process.env.APP_URL || 'http://localhost:5173'
      const verifyUrl = `${APP_URL}/verify-email-change?token=${token}`
      await sendEmail(
        newEmail,
        'Verify your new email address',
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
          <h2 style="font-size:18px;margin-bottom:4px">Tradelink</h2>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p>Click the link below to confirm your new email address. This link expires in 24 hours.</p>
          <p style="margin-top:16px"><a href="${verifyUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a></p>
          <p style="font-size:12px;color:#999">If you didn't request this, ignore this email.</p>
        </div>`,
      )

      return { success: true }
    },
  )

  // GET /account/verify-email-change?token=xxx
  app.get<{ Querystring: { token: string } }>(
    '/account/verify-email-change',
    async (request, reply) => {
      const { token } = request.query
      if (!token) return reply.status(400).send({ error: 'Token is required' })

      const raw = await redis.get(`email_change:${token}`)
      if (!raw) return reply.status(400).send({ error: 'Invalid or expired token' })

      const { userId, newEmail } = JSON.parse(raw) as { userId: string; newEmail: string }

      const existing = await prisma.user.findUnique({ where: { email: newEmail } })
      if (existing) return reply.status(409).send({ error: 'Email already in use' })

      await prisma.user.update({ where: { id: userId }, data: { email: newEmail } })
      await redis.del(`email_change:${token}`)

      return { success: true }
    },
  )

  // POST /account/change-password
  app.post<{ Body: { currentPassword: string; newPassword: string } }>(
    '/account/change-password',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body
      if (!currentPassword || !newPassword) {
        return reply.status(400).send({ error: 'Current and new passwords are required' })
      }
      if (newPassword.length < 8) {
        return reply.status(400).send({ error: 'New password must be at least 8 characters' })
      }

      const user = await prisma.user.findUnique({ where: { id: request.user.id } })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) return reply.status(401).send({ error: 'Incorrect current password' })

      const hash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({ where: { id: request.user.id }, data: { passwordHash: hash } })

      await sendEmail(
        user.email,
        'Your password was changed',
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
          <h2 style="font-size:18px;margin-bottom:4px">Tradelink</h2>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p>Your Tradelink password was successfully changed.</p>
          <p>If you didn't make this change, contact support immediately.</p>
        </div>`,
      )

      return { success: true }
    },
  )

  // DELETE /account/me (soft delete)
  app.delete<{ Body: { password: string } }>(
    '/account/me',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { password } = request.body
      if (!password) {
        return reply.status(400).send({ error: 'Password is required to delete your account' })
      }

      const user = await prisma.user.findUnique({ where: { id: request.user.id } })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) return reply.status(401).send({ error: 'Incorrect password' })

      // Delete avatar from storage
      if (user.avatar) {
        const key = extractStorageKey(user.avatar)
        if (key) await deleteFile(key).catch(() => {})
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          email: `deleted_${user.id}@tradelink.invalid`,
          name: 'Deleted User',
          firstName: null,
          lastName: null,
          phone: null,
          avatar: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          zipCode: null,
          passwordHash: '',
        },
      })

      return { success: true }
    },
  )
}
