import { useState } from 'react'
import type { FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { FileUpload } from '../FileUpload'

interface TierForm {
  name: string
  price: string
  description: string
  duration: string
  inclusions: string[]
  exclusions: string[]
  warranty: string
  inclusionInput: string
  exclusionInput: string
}

const makeTier = (): TierForm => ({
  name: '', price: '', description: '', duration: '',
  inclusions: [], exclusions: [], warranty: '',
  inclusionInput: '', exclusionInput: '',
})

interface Props {
  jobId: string
  onSubmitted: () => void
}

const inputCls =
  'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

function TagInput({
  tags, input, placeholder, color,
  onInputChange, onKeyDown, onBlur, onRemove,
}: {
  tags: string[]
  input: string
  placeholder: string
  color: 'green' | 'red'
  onInputChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur: () => void
  onRemove: (i: number) => void
}) {
  const tagCls = color === 'green' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  const btnCls = color === 'green' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'
  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, i) => (
            <span key={i} className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${tagCls}`}>
              {tag}
              <button type="button" onClick={() => onRemove(i)} className={`${btnCls} leading-none`}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )
}

export function ContractorQuoteForm({ jobId, onSubmitted }: Props) {
  const minChar = 20
  const [coverLetter, setCoverLetter] = useState('')
  const [tiers, setTiers] = useState<TierForm[]>([makeTier()])
  const [questions, setQuestions] = useState<string[]>([''])
  const [quoteFiles, setQuoteFiles] = useState<FileUploadRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const updateTier = (i: number, patch: Partial<TierForm>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))

  const addTag = (
    i: number,
    field: 'inclusions' | 'exclusions',
    inputField: 'inclusionInput' | 'exclusionInput',
  ) => {
    const val = tiers[i][inputField].trim()
    if (!val) return
    updateTier(i, { [field]: [...tiers[i][field], val], [inputField]: '' } as Partial<TierForm>)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (coverLetter.trim().length < minChar) {
      setError(`Cover letter must be at least ${minChar} characters.`)
      return
    }
    for (const tier of tiers) {
      if (!tier.name.trim() || !tier.price || !tier.description.trim() || !tier.duration.trim()) {
        setError('Please fill in all required tier fields (name, price, description, duration).')
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          coverLetter: coverLetter.trim(),
          tiers: tiers.map((t) => ({
            name: t.name.trim(),
            price: Number(t.price),
            description: t.description.trim(),
            duration: t.duration.trim(),
            inclusions: t.inclusions,
            exclusions: t.exclusions,
            ...(t.warranty.trim() ? { warranty: t.warranty.trim() } : {}),
          })),
          questions: questions
            .filter((q) => q.trim())
            .map((q) => ({ question: q.trim() })),
          fileIds: quoteFiles.map((f) => f.id),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to submit quote'); return }
      onSubmitted()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="font-semibold text-gray-900 mb-5">Submit a Quote</h3>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cover Letter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Cover Letter *</label>
            <span className={`text-xs tabular-nums ${coverLetter.length < minChar ? 'text-gray-400' : 'text-green-600 font-medium'}`}>
              {coverLetter.length} / {minChar} min
            </span>
          </div>
          <textarea
            required
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Introduce yourself, describe your experience with this type of work, and explain why you're the right contractor for this job…"
            className={inputCls + ' resize-none'}
          />
        </div>

        {/* Pricing Tiers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={labelCls}>Pricing Tiers * ({tiers.length}/3)</label>
            {tiers.length < 3 && (
              <button
                type="button"
                onClick={() => setTiers((prev) => [...prev, makeTier()])}
                className="text-xs text-violet-600 font-semibold hover:underline"
              >
                + Add tier
              </button>
            )}
          </div>
          <div className="space-y-4">
            {tiers.map((tier, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Tier {i + 1}</span>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input
                      type="text" required value={tier.name}
                      onChange={(e) => updateTier(i, { name: e.target.value })}
                      placeholder="e.g. Basic, Standard, Premium"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Price ($) *</label>
                    <input
                      type="number" required min="1" value={tier.price}
                      onChange={(e) => updateTier(i, { price: e.target.value })}
                      placeholder="e.g. 500"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className={labelCls}>Description *</label>
                  <textarea
                    required rows={2} value={tier.description}
                    onChange={(e) => updateTier(i, { description: e.target.value })}
                    placeholder="What does this tier cover?"
                    className={inputCls + ' resize-none'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Duration *</label>
                    <input
                      type="text" required value={tier.duration}
                      onChange={(e) => updateTier(i, { duration: e.target.value })}
                      placeholder="e.g. 1–2 days"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Warranty</label>
                    <input
                      type="text" value={tier.warranty}
                      onChange={(e) => updateTier(i, { warranty: e.target.value })}
                      placeholder="e.g. 1 year labor"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Inclusions</label>
                    <TagInput
                      tags={tier.inclusions}
                      input={tier.inclusionInput}
                      placeholder="Add item, press Enter"
                      color="green"
                      onInputChange={(v) => updateTier(i, { inclusionInput: v })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addTag(i, 'inclusions', 'inclusionInput')
                        }
                      }}
                      onBlur={() => addTag(i, 'inclusions', 'inclusionInput')}
                      onRemove={(ti) =>
                        updateTier(i, { inclusions: tier.inclusions.filter((_, idx) => idx !== ti) })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Exclusions</label>
                    <TagInput
                      tags={tier.exclusions}
                      input={tier.exclusionInput}
                      placeholder="Add item, press Enter"
                      color="red"
                      onInputChange={(v) => updateTier(i, { exclusionInput: v })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addTag(i, 'exclusions', 'exclusionInput')
                        }
                      }}
                      onBlur={() => addTag(i, 'exclusions', 'exclusionInput')}
                      onRemove={(ti) =>
                        updateTier(i, { exclusions: tier.exclusions.filter((_, idx) => idx !== ti) })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions for client */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={labelCls}>Questions for the Client</label>
            {questions.length < 5 && (
              <button
                type="button"
                onClick={() => setQuestions((prev) => [...prev, ''])}
                className="text-xs text-violet-600 font-semibold hover:underline"
              >
                + Add question
              </button>
            )}
          </div>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) =>
                    setQuestions((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                  }
                  placeholder={`Question ${i + 1} — optional`}
                  className={inputCls}
                />
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="px-2.5 text-gray-400 hover:text-red-500 transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio / Files */}
        <div>
          <label className={labelCls}>Portfolio & Documents</label>
          <FileUpload
            category="QUOTE_PHOTO"
            existingFiles={quoteFiles}
            onUploaded={(f) => setQuoteFiles((prev) => [...prev, f])}
            onRemoved={(id) => setQuoteFiles((prev) => prev.filter((f) => f.id !== id))}
            maxFiles={10}
            accept="image/*,application/pdf"
            label="Add photos of previous work or your license PDF"
            compact
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Quote'}
        </button>
      </form>
    </div>
  )
}
