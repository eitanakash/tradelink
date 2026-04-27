import { useEffect, useState } from 'react'
import type { Job, JobQuote, FileUploadRecord, QuoteQuestion } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { formatDateTime } from '../../lib/date'
import { QuoteTierCard } from '../QuoteTierCard'
import { ContractorQuoteForm } from './ContractorQuoteForm'

interface Props {
  jobId: string
  onBack: () => void
  onOpenConversation?: (conversationId: string) => void
}

export function ContractorJobDetail({ jobId, onBack, onOpenConversation }: Props) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTierIdx, setSelectedTierIdx] = useState(0)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [startingConv, setStartingConv] = useState(false)

  const token = localStorage.getItem('token')

  const loadJob = () => {
    setLoading(true)
    setSelectedTierIdx(0)
    fetch(`${API_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setJob(data)
        else setError(data.error ?? 'Failed to load job')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadJob() }, [jobId])

  const myQuote: JobQuote | undefined = job?.quotes?.[0]

  const handleWithdraw = async () => {
    if (!myQuote) return
    setWithdrawing(true)
    try {
      await fetch(`${API_URL}/contractor/quotes/${myQuote.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      onBack()
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error || !job) return <div className="text-center py-20 text-red-500">{error || 'Job not found'}</div>

  return (
    <div>
      <button onClick={onBack} className="text-sm text-violet-600 hover:underline mb-6 flex items-center gap-1">
        ← Back to jobs
      </button>

      {/* Job card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{job.category.icon}</span>
          <span className="text-sm text-gray-500">{job.category.name}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h2>
        <p className="text-gray-600 mb-3">{job.description}</p>
        <p className="text-sm text-gray-500">{job.address}, {job.city}, {job.state}</p>
        <p className="text-xs text-gray-400 mt-1">
          Posted {formatDateTime(job.createdAt)}{job.client ? ` by ${job.client.user.name}` : ''}
        </p>

        {(job.files ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Photos</p>
            <div className="grid grid-cols-4 gap-2">
              {job.files!.map((f: FileUploadRecord) =>
                f.mimeType.startsWith('image/') ? (
                  <img
                    key={f.id} src={f.url} alt={f.filename}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                  />
                ) : f.mimeType.startsWith('video/') ? (
                  <video
                    key={f.id} src={f.url} controls
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200 col-span-2"
                  />
                ) : (
                  <a
                    key={f.id} href={f.url} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center aspect-square bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 p-1 text-center hover:bg-gray-100"
                  >
                    📄 <span className="truncate w-full mt-1">{f.filename}</span>
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quote section */}
      {myQuote ? (
        <div
          className={`border rounded-2xl p-5 ${
            myQuote.status === 'ACCEPTED'
              ? 'border-green-300 bg-green-50'
              : myQuote.status === 'REJECTED'
              ? 'border-gray-200 bg-gray-50'
              : 'border-violet-200 bg-violet-50/30'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Your Quote</h3>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                myQuote.status === 'ACCEPTED'
                  ? 'bg-green-100 text-green-700'
                  : myQuote.status === 'REJECTED'
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {myQuote.status}
            </span>
          </div>

          {/* Cover letter */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cover Letter</p>
            <p className="text-sm text-gray-700 leading-relaxed">{myQuote.coverLetter}</p>
          </div>

          {/* Pricing tiers */}
          {myQuote.tiers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Pricing Tiers
              </p>
              {myQuote.tiers.length > 1 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {myQuote.tiers.map((tier, i) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTierIdx(i)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedTierIdx === i
                          ? 'bg-violet-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tier.name} · ${tier.price.toLocaleString()}
                    </button>
                  ))}
                </div>
              )}
              {myQuote.tiers[selectedTierIdx] && (
                <QuoteTierCard tier={myQuote.tiers[selectedTierIdx]} />
              )}
            </div>
          )}

          {/* Questions */}
          {myQuote.questions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Your Questions
              </p>
              <div className="space-y-2">
                {myQuote.questions.map((q: QuoteQuestion) => (
                  <div key={q.id} className="bg-white/70 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-800 mb-0.5">Q: {q.question}</p>
                    {q.answer ? (
                      <p className="text-xs text-gray-600">A: {q.answer}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Awaiting client's answer</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {(myQuote.files ?? []).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Attachments
              </p>
              <div className="grid grid-cols-4 gap-2">
                {myQuote.files!.map((f: FileUploadRecord) =>
                  f.mimeType.startsWith('image/') ? (
                    <img
                      key={f.id} src={f.url} alt={f.filename}
                      className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <a
                      key={f.id} href={f.url} target="_blank" rel="noreferrer"
                      className="flex flex-col items-center justify-center aspect-square bg-white/60 rounded-lg border border-gray-200 text-xs text-gray-600 p-1 text-center hover:bg-gray-50"
                    >
                      📄 <span className="truncate w-full mt-1">{f.filename}</span>
                    </a>
                  )
                )}
              </div>
            </div>
          )}

          {/* Status messages */}
          {myQuote.status === 'ACCEPTED' && (
            <div className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-800">
              🎉 Congratulations! The client accepted your quote.
            </div>
          )}
          {myQuote.status === 'REJECTED' && (
            <p className="text-sm text-gray-500">This quote was not selected by the client.</p>
          )}

          {/* Message client */}
          {onOpenConversation && (
            <button
              onClick={async () => {
                setStartingConv(true)
                try {
                  const res = await fetch(`${API_URL}/jobs/${jobId}/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({}),
                  })
                  const data = await res.json()
                  if (res.ok) onOpenConversation(data.conversationId)
                } finally {
                  setStartingConv(false)
                }
              }}
              disabled={startingConv}
              className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors"
            >
              💬 {startingConv ? '…' : 'Message client'}
            </button>
          )}

          {/* Withdraw */}
          {myQuote.status === 'PENDING' &&
            (confirmWithdraw ? (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-violet-100">
                <span className="text-sm text-gray-600">Withdraw this quote?</span>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {withdrawing ? '…' : 'Yes, withdraw'}
                </button>
                <button
                  onClick={() => setConfirmWithdraw(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWithdraw(true)}
                className="mt-2 pt-2 text-red-600 text-sm font-medium hover:underline"
              >
                Withdraw quote
              </button>
            ))}
        </div>
      ) : job.status === 'OPEN' ? (
        <ContractorQuoteForm jobId={jobId} onSubmitted={loadJob} />
      ) : (
        <p className="text-center text-sm text-gray-500 py-8">
          This job is no longer accepting quotes.
        </p>
      )}
    </div>
  )
}
