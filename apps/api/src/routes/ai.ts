import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { anthropic } from '../lib/anthropic'
import { getIntakePrompt } from '../prompts/intake'

const SESSION_TTL = 60 * 60 * 2 // 2 hours

const askIntakeQuestionTool = {
  name: 'ask_intake_question',
  description: 'Ask the homeowner the next single, concise intake question with four quick answers.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string',
        minLength: 1,
        description: 'One short question, about 18 words or fewer',
      },
      options: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: { type: 'string', minLength: 1 },
        description: 'Exactly four short, relevant answers; never include an Other option',
      },
    },
    required: ['question', 'options'],
  },
}

const completeIntakeTool = {
  name: 'complete_intake',
  description:
    'Call this when you have gathered enough information to create a complete job posting. Only call it once you have clear answers on scope, property details, and timeline.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'A concise job title (e.g. "Central AC Repair – 2,000 sq ft Home")',
      },
      description: {
        type: 'string',
        description: "Full job description written from the homeowner's perspective",
      },
      scopeOfWork: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of specific tasks the contractor will need to perform',
      },
      propertyDetails: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'e.g. Single-family home, Apartment, Commercial' },
          size: { type: 'string', description: 'e.g. 2,000 sq ft, 3 bedrooms' },
          age: { type: 'string', description: 'e.g. Built ~1990, Unknown' },
          floors: { type: 'string', description: 'e.g. 2 stories, Single story' },
        },
        required: ['type'],
      },
      timeline: {
        type: 'string',
        description: 'e.g. ASAP, Within 2 weeks, Flexible',
      },
      specialRequirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Any special requirements, preferences, or constraints',
      },
      estimatedComplexity: {
        type: 'string',
        enum: ['simple', 'moderate', 'complex'],
        description: 'Overall complexity of the job',
      },
    },
    required: ['title', 'description', 'scopeOfWork', 'propertyDetails', 'timeline', 'specialRequirements', 'estimatedComplexity'],
  },
}

interface IntakeSession {
  categoryId: string
  categoryName: string
  displayMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  apiMessages: any[]
  jobSummary: any | null
  isComplete: boolean
  pendingToolUseId: string | null
  pendingQuestionToolUseId: string | null
}

async function getSession(sessionId: string): Promise<IntakeSession | null> {
  const raw = await redis.get(`intake:${sessionId}`)
  if (!raw) return null
  return JSON.parse(raw)
}

async function saveSession(sessionId: string, session: IntakeSession) {
  await redis.setex(`intake:${sessionId}`, SESSION_TTL, JSON.stringify(session))
}

export async function aiRoutes(app: FastifyInstance) {
  app.post<{ Body: { categoryId: string } }>(
    '/ai/intake/start',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { categoryId } = request.body
      if (!categoryId) return reply.status(400).send({ error: 'categoryId is required' })

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const category = await prisma.tradeCategory.findUnique({ where: { id: categoryId } })
      if (!category) return reply.status(404).send({ error: 'Category not found' })

      const { firstMessage, firstOptions } = getIntakePrompt(category.name)
      const sessionId = randomUUID()

      const session: IntakeSession = {
        categoryId,
        categoryName: category.name,
        displayMessages: [{ role: 'assistant', content: firstMessage }],
        apiMessages: [],
        jobSummary: null,
        isComplete: false,
        pendingToolUseId: null,
        pendingQuestionToolUseId: null,
      }
      await saveSession(sessionId, session)

      return { sessionId, firstMessage, quickReplies: firstOptions }
    },
  )

  app.post<{
    Body: {
      sessionId: string
      message: string
      imageUrls?: Array<{ url: string; mimeType: string }>
    }
  }>(
    '/ai/intake/message',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { sessionId, message, imageUrls } = request.body
      if (!sessionId || !message) {
        return reply.status(400).send({ error: 'sessionId and message are required' })
      }

      const session = await getSession(sessionId)
      if (!session) return reply.status(404).send({ error: 'Session not found or expired' })

      const { system } = getIntakePrompt(session.categoryName)

      // Build user content — fetch images from storage and convert to base64 for Claude
      const userContent: any[] = []
      if (imageUrls?.length) {
        for (const img of imageUrls) {
          try {
            const imgRes = await fetch(img.url)
            const buffer = await imgRes.arrayBuffer()
            const base64 = Buffer.from(buffer).toString('base64')
            userContent.push({
              type: 'image',
              source: { type: 'base64', media_type: img.mimeType, data: base64 },
            })
          } catch {
            // skip images that can't be fetched
          }
        }
      }
      userContent.push({ type: 'text', text: message })

      const userApiMessage =
        userContent.length === 1 && userContent[0].type === 'text'
          ? { role: 'user' as const, content: message }
          : { role: 'user' as const, content: userContent }

      // If we're continuing after complete_intake was called, send the tool_result first
      let newApiMessages = [...session.apiMessages]
      if (session.isComplete && session.pendingToolUseId) {
        newApiMessages.push({
          role: 'user' as const,
          content: [
            {
              type: 'tool_result',
              tool_use_id: session.pendingToolUseId,
              content: 'The client wants to add more details before confirming.',
            },
            ...(Array.isArray(userApiMessage.content)
              ? userApiMessage.content
              : [{ type: 'text', text: message }]),
          ],
        })
      } else if (session.pendingQuestionToolUseId) {
        newApiMessages.push({
          role: 'user' as const,
          content: [
            {
              type: 'tool_result',
              tool_use_id: session.pendingQuestionToolUseId,
              content: `The homeowner answered: ${message}`,
            },
            ...(Array.isArray(userApiMessage.content)
              ? userApiMessage.content
              : [{ type: 'text', text: message }]),
          ],
        })
      } else {
        newApiMessages.push(userApiMessage)
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        tools: [askIntakeQuestionTool as any, completeIntakeTool as any],
        tool_choice: { type: 'any' },
        messages: newApiMessages,
      })

      let reply_text = ''
      let isComplete = false
      let jobSummary: any = null
      let pendingToolUseId: string | null = null
      let pendingQuestionToolUseId: string | null = null
      let quickReplies: string[] = []

      for (const block of response.content) {
        if (block.type === 'text') {
          reply_text += block.text
        } else if (block.type === 'tool_use' && block.name === 'ask_intake_question') {
          const input = block.input as { question?: unknown; options?: unknown }
          if (
            typeof input.question === 'string' &&
            Array.isArray(input.options) &&
            input.options.length === 4 &&
            input.options.every((option) => typeof option === 'string')
          ) {
            reply_text = input.question.trim()
            quickReplies = input.options.map((option) => option.trim())
            pendingQuestionToolUseId = block.id
          }
        } else if (block.type === 'tool_use' && block.name === 'complete_intake') {
          isComplete = true
          jobSummary = block.input
          pendingToolUseId = block.id
          if (!reply_text) {
            reply_text =
              "I have everything I need to write up your job posting. Take a look at the summary below — if it looks good, you can confirm it. Otherwise, just keep chatting and I'll update it."
          }
        }
      }

      // Store assistant message in API format
      newApiMessages.push({ role: 'assistant', content: response.content })

      session.apiMessages = newApiMessages
      session.displayMessages.push({ role: 'user', content: message })
      session.displayMessages.push({ role: 'assistant', content: reply_text })

      if (isComplete) {
        session.isComplete = true
        session.jobSummary = jobSummary
        session.pendingToolUseId = pendingToolUseId
        session.pendingQuestionToolUseId = null
      } else {
        session.isComplete = false
        session.jobSummary = null
        session.pendingToolUseId = null
        session.pendingQuestionToolUseId = pendingQuestionToolUseId
      }

      await saveSession(sessionId, session)

      return { reply: reply_text, quickReplies, isComplete, jobSummary }
    },
  )

  app.post<{
    Body: { sessionId: string; address: string; city: string; state: string }
  }>(
    '/ai/intake/confirm',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { sessionId, address, city, state } = request.body
      if (!sessionId || !address || !city || !state) {
        return reply.status(400).send({ error: 'sessionId, address, city, and state are required' })
      }

      const session = await getSession(sessionId)
      if (!session) return reply.status(404).send({ error: 'Session not found or expired' })
      if (!session.jobSummary) return reply.status(400).send({ error: 'No job summary available' })

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: request.user.id },
      })
      if (!clientProfile) return reply.status(403).send({ error: 'Client profile required' })

      const { title, description } = session.jobSummary

      const job = await prisma.job.create({
        data: {
          title,
          description,
          address,
          city,
          state,
          categoryId: session.categoryId,
          clientId: clientProfile.id,
        },
      })

      // Link any files uploaded during this intake session to the new job
      await prisma.fileUpload.updateMany({
        where: { sessionId },
        data: { jobId: job.id },
      })

      await redis.del(`intake:${sessionId}`)

      return { jobId: job.id }
    },
  )
}
