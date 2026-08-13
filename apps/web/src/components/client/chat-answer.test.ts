import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveChatAnswer } from './chat-answer'

test('quick selection becomes the submitted answer and advances through the normal send path', () => {
  assert.equal(resolveChatAnswer('ignored draft', ' Mini-split '), 'Mini-split')
})

test('custom typed answers are preserved', () => {
  assert.equal(resolveChatAnswer('I have two rooftop units', undefined), 'I have two rooftop units')
})
