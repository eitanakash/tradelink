import { useEffect, useState } from 'react'
import type { Job, JobQuote, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { FileUpload } from '../FileUpload'

interface Props {
  jobId: string
  onBack: () => void
}

export function ContractorJobDetail({ jobId, onBack }: Props) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [quoteFiles, setQuoteFiles] = useState<FileUploadRecord[]>([])
  const [newQuoteId, setNewQuoteId] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  const token = localStorage.getItem('token')

  const loadJob = () => {
    setLoading(true)
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

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), notes }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to submit quote'); return }
      setNewQuoteId(data.id)
      loadJob()
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = () => {
    if (!myQuote) return
    setEditAmount(String(myQuote.amount))
    setEditNotes(myQuote.notes)
    setSaveError('')
    setEditing(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myQuote) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`${API_URL}/contractor/quotes/${myQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(editAmount), notes: editNotes }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error ?? 'Failed to save'); return }
      setEditing(false)
      loadJob()
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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

  const inputCls =
    'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <button onClick={onBack} className="text-sm text-violet-600 hover:underline mb-6 flex items-center gap-1">
        ← Back to jobs
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{job.category.icon}</span>
          <span className="text-sm text-gray-500">{job.category.name}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h2>
        <p className="text-gray-600 mb-3">{job.description}</p>
        <p className="text-sm text-gray-500">{job.address}, {job.city}, {job.state}</p>
        {job.client && <p className="text-sm text-gray-400 mt-1">Posted by {job.client.user.name}</p>}

        {(job.files ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Photos</p>
            <div className="grid grid-cols-4 gap-2">
              {job.files!.map((f: FileUploadRecord) =>
                f.mimeType.startsWith('image/') ? (
                  <img key={f.id} src={f.url} alt={f.filename}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                ) : f.mimeType.startsWith('video/') ? (
                  <video key={f.id} src={f.url} controls
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200 col-span-2" />
                ) : (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center aspect-square bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 p-1 text-center hover:bg-gray-100">
                    📄 <span className="truncate w-full mt-1">{f.filename}</span>
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {myQuote ? (
        <div
          className={`border rounded-2xl p-5 ${
            myQuote.status === 'ACCEPTED'
              ? 'border-green-300 bg-green-50'
              : myQuote.status === 'REJECTED'
              ? 'border-gray-200 bg-gray-50'
              : 'border-yellow-200 bg-yellow-50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your Quote</h3>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
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

          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}
              <div>
                <label className={labelCls}>Price ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  required
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                ${myQuote.amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mb-3">{myQuote.notes}</p>

              {(myQuote.files ?? []).length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {myQuote.files!.map((f) =>
                    f.mimeType.startsWith('image/') ? (
                      <img key={f.id} src={f.url} alt={f.filename} className="w-full aspect-square object-cover rounded-lg border border-yellow-200" />
                    ) : (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center aspect-square bg-white/60 rounded-lg border border-yellow-200 text-xs text-gray-600 p-1 text-center">
                        📄 <span className="truncate w-full">{f.filename}</span>
                      </a>
                    ),
                  )}
                </div>
              )}

              {myQuote.status === 'ACCEPTED' && (
                <p className="text-sm font-medium text-green-700">
                  Congratulations! The client accepted your quote.
                </p>
              )}

              {myQuote.status === 'PENDING' && (
                confirmWithdraw ? (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm text-gray-600 mr-1">Withdraw this quote?</span>
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
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={startEdit}
                      className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmWithdraw(true)}
                      className="px-4 py-1.5 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      ) : job.status === 'OPEN' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Submit a Quote</h3>
          {submitError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmitQuote} className="space-y-4">
            <div>
              <label className={labelCls}>Your price ($)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 350"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your approach, timeline, materials included…"
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Quote'}
            </button>
          </form>

          {newQuoteId && (
            <div className="mt-5 pt-5 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Add photos or documents to your quote
              </p>
              <p className="text-xs text-gray-500 mb-3">Show previous work or attach your license</p>
              <FileUpload
                category="QUOTE_PHOTO"
                quoteId={newQuoteId}
                existingFiles={quoteFiles}
                onUploaded={(f) => setQuoteFiles((prev) => [...prev, f])}
                onRemoved={(id) => setQuoteFiles((prev) => prev.filter((f) => f.id !== id))}
                maxFiles={10}
                accept="image/*,application/pdf"
                label="Add photos of previous work or license PDF"
                compact
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-8">
          This job is no longer accepting quotes.
        </p>
      )}
    </div>
  )
}
