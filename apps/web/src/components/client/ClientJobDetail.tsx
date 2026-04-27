import { useEffect, useState } from 'react'
import type { Job, JobQuote, TradeCategory, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { US_STATES } from '../../lib/states'
import { FileUpload } from '../FileUpload'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  AWARDED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const QUOTE_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 border-yellow-200',
  ACCEPTED: 'bg-green-50 border-green-300',
  REJECTED: 'bg-gray-50 border-gray-200',
}

const canEdit = (status: string) => ['OPEN', 'IN_REVIEW'].includes(status)

interface Props {
  jobId: string
  onBack: () => void
  onDeleted: () => void
}

export function ClientJobDetail({ jobId, onBack, onDeleted }: Props) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioning, setActioning] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [jobFiles, setJobFiles] = useState<FileUploadRecord[]>([])

  const token = localStorage.getItem('token')

  const loadJob = () => {
    setLoading(true)
    fetch(`${API_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) { setJob(data); setJobFiles(data.files ?? []) }
        else setError(data.error ?? 'Failed to load job')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadJob() }, [jobId])

  useEffect(() => {
    fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
  }, [])

  const startEdit = () => {
    if (!job) return
    setEditTitle(job.title)
    setEditDescription(job.description)
    setEditAddress(job.address)
    setEditCity(job.city)
    setEditState(job.state)
    setEditCategoryId(job.categoryId)
    setSaveError('')
    setEditing(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          address: editAddress,
          city: editCity,
          state: editState,
          categoryId: editCategoryId,
        }),
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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  const handleQuoteAction = async (quote: JobQuote, action: 'ACCEPT' | 'REJECT') => {
    setActioning(quote.id)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      if (res.ok) loadJob()
    } finally {
      setActioning(null)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error || !job) return <div className="text-center py-20 text-red-500">{error || 'Job not found'}</div>

  const pendingQuotes = job.quotes?.filter((q) => q.status === 'PENDING') ?? []
  const otherQuotes = job.quotes?.filter((q) => q.status !== 'PENDING') ?? []

  const inputCls =
    'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
        ← Back to jobs
      </button>

      {/* Job card */}
      {editing ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Edit Job</h3>
          {saveError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {saveError}
            </div>
          )}
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className={inputCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                required
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div>
              <label className={labelCls}>Street address</label>
              <input
                type="text"
                required
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <select
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className={inputCls}
                >
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{job.category.icon}</span>
                <span className="text-sm text-gray-500">{job.category.name}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[job.status]}`}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-gray-600 mb-3">{job.description}</p>
          <p className="text-sm text-gray-500">{job.address}, {job.city}, {job.state}</p>

          {canEdit(job.status) && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={startEdit}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Delete this job?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {deleting ? '…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Job media */}
      {canEdit(job.status) && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-1">Photos & Documents</h3>
          <p className="text-sm text-gray-500 mb-3">Help contractors understand the job</p>
          <FileUpload
            category="JOB_PHOTO"
            jobId={jobId}
            existingFiles={jobFiles}
            onUploaded={(f) => setJobFiles((prev) => [...prev, f])}
            onRemoved={(id) => setJobFiles((prev) => prev.filter((f) => f.id !== id))}
            maxFiles={20}
            accept="image/*,application/pdf,video/mp4,video/quicktime"
            label="Add photos, videos or documents"
          />
        </div>
      )}
      {!canEdit(job.status) && jobFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Attachments</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {jobFiles.map((f: FileUploadRecord) => {
              if (f.mimeType.startsWith('image/')) {
                return (
                  <button key={f.id} onClick={() => setLightboxUrl(f.url)}
                    className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                    <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
                  </button>
                )
              }
              if (f.mimeType.startsWith('video/')) {
                return (
                  <div key={f.id} className="aspect-square rounded-xl overflow-hidden border border-gray-200 col-span-2">
                    <video src={f.url} controls className="w-full h-full object-cover" />
                  </div>
                )
              }
              return (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                  className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors p-2">
                  <span className="text-2xl">📄</span>
                  <span className="text-xs text-gray-500 text-center truncate w-full px-1">{f.filename}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quotes */}
      <h3 className="font-semibold text-gray-900 mb-3">
        Quotes ({job.quotes?.length ?? 0})
      </h3>

      {(job.quotes?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No quotes yet. Check back soon.</p>
      )}

      <div className="space-y-3">
        {[...pendingQuotes, ...otherQuotes].map((quote) => (
          <div key={quote.id} className={`border rounded-xl p-4 ${QUOTE_COLORS[quote.status]}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-gray-900">${quote.amount.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-2">
                  from {quote.contractor?.user.name ?? 'Contractor'}
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  quote.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700'
                    : quote.status === 'REJECTED'
                    ? 'bg-gray-200 text-gray-500'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {quote.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{quote.notes}</p>
            {(quote.files ?? []).length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {quote.files!.map((f: FileUploadRecord) =>
                  f.mimeType.startsWith('image/') ? (
                    <button
                      key={f.id}
                      onClick={() => setLightboxUrl(f.url)}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                    >
                      <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white/60 hover:bg-gray-50 transition-colors p-1"
                    >
                      <span className="text-xl">📄</span>
                      <span className="text-xs text-gray-500 truncate w-full text-center">{f.filename}</span>
                    </a>
                  ),
                )}
              </div>
            )}
            {quote.status === 'PENDING' && job.status !== 'AWARDED' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuoteAction(quote, 'ACCEPT')}
                  disabled={actioning === quote.id}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {actioning === quote.id ? '…' : 'Accept'}
                </button>
                <button
                  onClick={() => handleQuoteAction(quote, 'REJECT')}
                  disabled={actioning === quote.id}
                  className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
