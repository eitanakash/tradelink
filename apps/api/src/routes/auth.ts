import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

type Role = 'CLIENT' | 'CONTRACTOR'

interface RegisterBody {
  email: string
  password: string
  name: string
  initialRole: Role
  state?: string
}

interface LoginBody {
  email: string
  password: string
}

interface AddRoleBody {
  role: Role
  state?: string
}

const profileSelect = {
  id: true,
  email: true,
  name: true,
  clientProfile: { select: { id: true } },
  contractorProfile: { select: { id: true } },
} as const

function formatUser(user: {
  id: string
  email: string
  name: string
  clientProfile: { id: string } | null
  contractorProfile: { id: string } | null
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    hasClientProfile: !!user.clientProfile,
    hasContractorProfile: !!user.contractorProfile,
    clientProfileId: user.clientProfile?.id ?? null,
    contractorProfileId: user.contractorProfile?.id ?? null,
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/auth/register', async (request, reply) => {
    const { email, password, name, initialRole, state } = request.body

    if (!email || !password || !name || !initialRole) {
      return reply.status(400).send({ error: 'All fields are required' })
    }
    if (!['CLIENT', 'CONTRACTOR'].includes(initialRole)) {
      return reply.status(400).send({ error: 'initialRole must be CLIENT or CONTRACTOR' })
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' })
    }
    if (initialRole === 'CONTRACTOR' && !state) {
      return reply.status(400).send({ error: 'State is required for contractor registration' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        ...(initialRole === 'CLIENT'
          ? { clientProfile: { create: {} } }
          : { contractorProfile: { create: { state: state! } } }),
      },
    })

    const token = app.jwt.sign({ id: user.id, email: user.email, name: user.name })
    return reply.status(201).send({ token })
  })

  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, name: user.name })
    return { token }
  })

  app.get('/auth/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: profileSelect,
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return formatUser(user)
  })

  app.post<{ Body: AddRoleBody }>(
    '/auth/add-role',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { role, state } = request.body
      const userId = request.user.id

      if (!['CLIENT', 'CONTRACTOR'].includes(role)) {
        return reply.status(400).send({ error: 'role must be CLIENT or CONTRACTOR' })
      }
      if (role === 'CONTRACTOR' && !state) {
        return reply.status(400).send({ error: 'State is required to join as a contractor' })
      }

      try {
        if (role === 'CLIENT') {
          await prisma.clientProfile.create({ data: { userId } })
        } else {
          await prisma.contractorProfile.create({ data: { userId, state: state! } })
        }
      } catch (e: any) {
        if (e.code === 'P2002') {
          const label = role === 'CLIENT' ? 'Client' : 'Contractor'
          return reply.status(409).send({ error: `${label} profile already exists` })
        }
        throw e
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: profileSelect,
      })
      return formatUser(user!)
    },
  )
}
