import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuickReplyChoices } from './QuickReplyChoices'

test('renders every relevant quick option as an enabled button', () => {
  const markup = renderToStaticMarkup(<QuickReplyChoices options={['Repair', 'Replace', 'Maintain', 'Not sure']} disabled={false} onSelect={() => {}} />)
  assert.equal((markup.match(/<button/g) ?? []).length, 4)
  assert.match(markup, />Repair</)
  assert.doesNotMatch(markup, /disabled=""/)
})

test('selection passes the option into the same custom-answer submission callback', () => {
  let submitted = ''
  const element = QuickReplyChoices({ options: ['Central air', 'Mini-split'], disabled: false, onSelect: (answer) => { submitted = answer } })
  const firstButton = (element as any).props.children[0]
  firstButton.props.onClick()
  assert.equal(submitted, 'Central air')
})
