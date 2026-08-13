import assert from 'node:assert/strict'
import test from 'node:test'
import { getIntakePrompt } from './intake'

test('initial questions have useful quick choices and custom answers remain implicit', () => {
  const prompt = getIntakePrompt('AC Installation')
  assert.equal(prompt.firstOptions.length, 4)
  assert.equal(prompt.firstOptions.includes('Other'), false)
})

test('flow is adaptive, clarification-aware, and capped', () => {
  const { system } = getIntakePrompt('Plumbing')
  assert.match(system, /never ask for a fact already supplied/)
  assert.match(system, /do not treat it as an answer/)
  assert.match(system, /never exceed 6/)
  assert.match(system, /pricing-relevant scope/)
})
