export interface IntakeQuestion {
  message: string
  question: string
  options: string[]
  toolUseId: string
}

export interface ParsedIntakeResponse {
  reply: string
  question: IntakeQuestion | null
  isComplete: boolean
  jobSummary: Record<string, unknown> | null
  completionToolUseId: string | null
}

type ResponseBlock = {
  type: string
  text?: string
  id?: string
  name?: string
  input?: unknown
}

export function parseIntakeResponse(content: ResponseBlock[]): ParsedIntakeResponse {
  const text = content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text!.trim())
    .filter(Boolean)
    .join('\n\n')

  for (const block of content) {
    if (block.type !== 'tool_use' || block.name !== 'complete_intake' || !block.id) continue
    return {
      reply: text || "I have enough detail to prepare your job. Review the summary and tell me if anything needs changing.",
      question: null,
      isComplete: true,
      jobSummary: block.input as Record<string, unknown>,
      completionToolUseId: block.id,
    }
  }

  for (const block of content) {
    if (block.type !== 'tool_use' || block.name !== 'ask_intake_question' || !block.id) continue
    const input = block.input as { message?: unknown; question?: unknown; options?: unknown }
    const options = Array.isArray(input.options)
      ? input.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
      : []
    if (typeof input.question !== 'string' || !input.question.trim() || options.length < 2 || options.length > 4) continue
    const message = typeof input.message === 'string' ? input.message.trim() : ''
    const question = input.question.trim()
    return {
      reply: [text, message, question].filter(Boolean).join('\n\n'),
      question: { message, question, options, toolUseId: block.id },
      isComplete: false,
      jobSummary: null,
      completionToolUseId: null,
    }
  }

  return { reply: text, question: null, isComplete: false, jobSummary: null, completionToolUseId: null }
}

export function pendingQuestionResult(message: string): string {
  return `Homeowner response: ${message}\nThis may be an answer, a clarification request, or both. Interpret it in context. If it is a clarification, answer it before asking the same or next necessary intake question.`
}
