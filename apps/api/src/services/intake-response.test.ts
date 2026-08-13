import assert from 'node:assert/strict'
import test from 'node:test'
import { parseIntakeResponse, pendingQuestionResult } from './intake-response'

test('parses two to four quick options and preserves a clarification before the question', () => {
  const result = parseIntakeResponse([{ type: 'tool_use', id: 'q1', name: 'ask_intake_question', input: {
    message: 'Central air cools through ducts; mini-splits use wall-mounted zones.',
    question: 'Which setup fits your home?',
    options: ['Central air', 'Mini-split', 'Window units', 'Not sure'],
  } }])
  assert.deepEqual(result.question?.options, ['Central air', 'Mini-split', 'Window units', 'Not sure'])
  assert.match(result.reply, /Central air cools/)
  assert.match(result.reply, /Which setup/)
})

test('keeps follow-up language explicitly distinct from an accepted answer', () => {
  const result = pendingQuestionResult('What are my options?')
  assert.match(result, /clarification request/)
  assert.match(result, /answer it before asking/)
})

test('returns pricing-relevant structured completion data', () => {
  const summary = {
    title: 'Replace central AC', description: 'Replace a 15-year-old system.', scopeOfWork: ['Remove old condenser'],
    propertyDetails: { type: 'Single-family home', size: '2,000 sq ft' }, timeline: 'Within two weeks',
    siteConditions: ['Attic access available'], preferences: ['Quiet equipment'], budget: '$8,000–$12,000',
    specialRequirements: [], estimatedComplexity: 'moderate',
  }
  const result = parseIntakeResponse([{ type: 'tool_use', id: 'done', name: 'complete_intake', input: summary }])
  assert.equal(result.isComplete, true)
  assert.deepEqual(result.jobSummary, summary)
})
