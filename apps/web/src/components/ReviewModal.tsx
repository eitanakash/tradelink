import { useState } from 'react'
import { API_URL } from '../lib/api'
import { StarRating } from './StarRating'

interface Props {
  jobId: string
  contractorName: string
  onClose: () => void
  onSubmitted: () => void
}

const SUB_RATINGS = [
  { key: 'qualityRating', label: 'Quality of Work' },
  { key: 'communicationRating', label: 'Communication' },
  { key: 'timelinessRating', label: 'Timeliness' },
  { key: 'valueRating', label: 'Value for Money' },
] as const

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export function ReviewModal({ jobId, contractorName, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState(1)
  const [rating, setRating] = useState(0)
  const [subs, setSubs] = useState({ qualityRating: 0, communicationRating: 0, timelinessRating: 0, valueRating: 0 })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const token = localStorage.getItem('token')
  const minBody = 10
  const allSubsSet = Object.values(subs).every((v) => v > 0)

  const handleSubmit = async () => {
    if (body.trim().length < minBody) { setError(`Review must be at least ${minBody} characters`); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rating,
          title: title.trim() || `${rating}-star review`,
          body: body.trim(),
          ...subs,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to submit review'); return }
      setDone(true)
      setTimeout(onSubmitted, 1500)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {done ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Review Submitted!</h2>
            <p className="text-sm text-gray-500">Thank you for your feedback.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Leave a Review</h2>
                <p className="text-sm text-gray-500">Your experience with {contractorName}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                ✕
              </button>
            </div>

            {/* Step progress */}
            <div className="flex gap-1.5 px-5 pt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-violet-500' : 'bg-gray-200'}`} />
              ))}
            </div>

            <div className="p-5">
              {/* Step 1: Overall rating */}
              {step === 1 && (
                <div className="text-center py-6">
                  <p className="text-lg font-semibold text-gray-900 mb-8">Overall, how was the work?</p>
                  <div className="flex justify-center mb-3">
                    <StarRating value={rating} size="lg" interactive onChange={setRating} />
                  </div>
                  {rating > 0 && (
                    <p className="text-sm font-medium text-gray-500 mb-8">{RATING_LABELS[rating]}</p>
                  )}
                  <button
                    onClick={() => setStep(2)}
                    disabled={rating === 0}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Sub-ratings */}
              {step === 2 && (
                <div>
                  <p className="text-base font-semibold text-gray-900 mb-5">Rate specific aspects</p>
                  <div className="space-y-5">
                    {SUB_RATINGS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 w-36 shrink-0">{label}</span>
                        <StarRating
                          value={subs[key]}
                          size="md"
                          interactive
                          onChange={(v) => setSubs((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-7">
                    <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!allSubsSet}
                      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Written review */}
              {step === 3 && (
                <div>
                  <p className="text-base font-semibold text-gray-900 mb-4">Write your review</p>
                  {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                      {error}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="font-normal text-gray-400">(optional)</span></label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Great work, highly recommend"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Describe the quality of work, communication, and overall experience…"
                        rows={5}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      />
                      <p className={`text-xs mt-1 text-right ${body.trim().length >= minBody ? 'text-green-600' : 'text-gray-400'}`}>
                        {body.trim().length} / {minBody} min
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || body.trim().length < minBody}
                      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {submitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
