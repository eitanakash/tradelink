import { useEffect, useState } from 'react'
import type { Job, JobQuote, TradeCategory, FileUploadRecord, QuoteQuestion } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { US_STATES } from '../../lib/states'
import { formatDateTime } from '../../lib/date'
import { FileUpload } from '../FileUpload'
import { useT } from '../../lib/i18n'
import { QuoteTierCard } from '../QuoteTierCard'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  AWARDED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const canEdit = (status: string) => ['OPEN', 'IN_REVIEW'].includes(status)

interface Props {
  jobId: string
  onBack: () => void
  onDeleted: () => void
  onOpenConversation?: (conversationId: string) => void
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

function MarkdownView({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} className="font-bold text-gray-900 text-base mt-4 mb-1 first:mt-0">{renderInline(line.slice(3))}</h3>
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-gray-800 text-sm mt-3 mb-0.5">{renderInline(line.slice(4))}</h4>
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="shrink-0 text-gray-400 mt-0.5">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          )
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm text-gray-700">{renderInline(line)}</p>
      })}
    </div>
  )
}

export function ClientJobDetail({ jobId, onBack, onDeleted, onOpenConversation }: Props) {
  const { t } = useT()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioning, setActioning] = useState<string | null>(null)

  // Edit job state
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

  // Quote UX state
  const [selectedTierIds, setSelectedTierIds] = useState<Record<string, string>>({})
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({})
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null)
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set())
  const [startingConv, setStartingConv] = useState<string | null>(null)

  // AI panel state
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [followUp, setFollowUp] = useState('')

  const token = localStorage.getItem('token')

  const loadJob = () => {
    setLoading(true)
    fetch(`${API_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setJob(data)
          setJobFiles(data.files ?? [])
          // Auto-select first tier for each quote
          const initial: Record<string, string> = {}
          for (const q of data.quotes ?? []) {
            if (q.tiers?.length > 0) initial[q.id] = q.tiers[0].id
          }
          setSelectedTierIds((prev) => ({ ...initial, ...prev }))
          // Auto-expand pending quotes
          const pending = (data.quotes ?? []).filter((q: JobQuote) => q.status === 'PENDING')
          if (pending.length > 0) {
            setExpandedQuotes(new Set(pending.map((q: JobQuote) => q.id)))
          }
        } else {
          setError(data.error ?? 'Failed to load job')
        }
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

  const handleAccept = async (quote: JobQuote) => {
    const tierId = selectedTierIds[quote.id]
    if (!tierId) return
    setActioning(quote.id)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes/${quote.id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tierId }),
      })
      if (res.ok) loadJob()
    } finally {
      setActioning(null)
    }
  }

  const handleReject = async (quote: JobQuote) => {
    setActioning(quote.id)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes/${quote.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) loadJob()
    } finally {
      setActioning(null)
    }
  }

  const handleAnswerQuestion = async (quoteId: string, question: QuoteQuestion) => {
    const answer = (answerInputs[question.id] ?? '').trim()
    if (!answer) return
    setAnsweringQuestion(question.id)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes/${quoteId}/answer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: question.id, answer }),
      })
      if (res.ok) {
        setAnswerInputs((prev) => ({ ...prev, [question.id]: '' }))
        loadJob()
      }
    } finally {
      setAnsweringQuestion(null)
    }
  }

  const handleAnalyze = async (followUpText?: string) => {
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/quotes/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(followUpText ? { followUp: followUpText } : {}),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error ?? 'Analysis failed'); return }
      setAiAnalysis(data.analysis)
      setFollowUp('')
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (error || !job) return <div className="text-center py-20 text-red-500">{error || 'Job not found'}</div>

  const pendingQuotes = job.quotes?.filter((q) => q.status === 'PENDING') ?? []
  const otherQuotes = job.quotes?.filter((q) => q.status !== 'PENDING') ?? []
  const allQuotes = [...pendingQuotes, ...otherQuotes]

  const inputCls =
    'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
        {t('backToJobs')}
      </button>

      {/* Job card */}
      {editing ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t('editJob')}</h3>
          {saveError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {saveError}
            </div>
          )}
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className={labelCls}>{t('categoryLabel')}</label>
              <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('titleLabel')}</label>
              <input type="text" required value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('descriptionLabel')}</label>
              <textarea required value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>{t('streetAddress')}</label>
              <input type="text" required value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('cityLabel')}</label>
                <input type="text" required value={editCity}
                  onChange={(e) => setEditCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('stateLabel')}</label>
                <select value={editState} onChange={(e) => setEditState(e.target.value)} className={inputCls}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors">
                {saving ? t('saving') : t('saveChanges')}
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
          <p className="text-xs text-gray-400 mt-1">Posted {formatDateTime(job.createdAt)}</p>

          {canEdit(job.status) && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={startEdit}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('editBtn')}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('deleteJobConfirm')}</span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors">
                    {deleting ? '…' : t('yesDelete')}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  {t('deleteBtn')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Job media */}
      {canEdit(job.status) && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-1">{t('photosAndDocs')}</h3>
          <p className="text-sm text-gray-500 mb-3">{t('photosAndDocsHint')}</p>
          <FileUpload
            category="JOB_PHOTO"
            jobId={jobId}
            existingFiles={jobFiles}
            onUploaded={(f) => setJobFiles((prev) => [...prev, f])}
            onRemoved={(id) => setJobFiles((prev) => prev.filter((f) => f.id !== id))}
            maxFiles={20}
            accept="image/*,application/pdf,video/mp4,video/quicktime"
            label={t('addFilesHint')}
          />
        </div>
      )}
      {!canEdit(job.status) && jobFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t('attachments')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {jobFiles.map((f: FileUploadRecord) =>
              f.mimeType.startsWith('image/') ? (
                <button key={f.id} onClick={() => setLightboxUrl(f.url)}
                  className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
                </button>
              ) : f.mimeType.startsWith('video/') ? (
                <div key={f.id} className="aspect-square rounded-xl overflow-hidden border border-gray-200 col-span-2">
                  <video src={f.url} controls className="w-full h-full object-cover" />
                </div>
              ) : (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                  className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors p-2">
                  <span className="text-2xl">📄</span>
                  <span className="text-xs text-gray-500 text-center truncate w-full px-1">{f.filename}</span>
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-lg">
            ✕
          </button>
        </div>
      )}

      {/* Quotes header + AI panel toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">
          {t('quotesLabel')} ({job.quotes?.length ?? 0})
        </h3>
        {(job.quotes?.length ?? 0) > 0 && (
          <button
            onClick={() => setShowAiPanel((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              showAiPanel
                ? 'bg-violet-100 text-violet-700'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ✦ AI Analysis
          </button>
        )}
      </div>

      {/* AI comparison panel */}
      {showAiPanel && (
        <div className="mb-6 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-violet-600 text-lg">✦</span>
            <h4 className="font-semibold text-violet-900">AI Quote Analysis</h4>
          </div>
          <p className="text-sm text-violet-700/80 mb-4">
            Get an unbiased breakdown of all quotes — pricing, value, risks, and a recommendation.
          </p>

          {aiError && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {aiError}
            </div>
          )}

          {aiAnalysis ? (
            <div className="bg-white rounded-xl border border-violet-100 p-4 mb-4">
              <MarkdownView text={aiAnalysis} />
            </div>
          ) : null}

          {!aiAnalysis && (
            <button
              onClick={() => handleAnalyze()}
              disabled={aiLoading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-colors mb-3"
            >
              {aiLoading ? 'Analyzing…' : 'Analyze Quotes'}
            </button>
          )}

          {aiAnalysis && (
            <div className="flex gap-2">
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && followUp.trim()) handleAnalyze(followUp.trim())
                }}
                placeholder="Ask a follow-up question…"
                className="flex-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                onClick={() => { if (followUp.trim()) handleAnalyze(followUp.trim()) }}
                disabled={aiLoading || !followUp.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {aiLoading ? '…' : 'Ask'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allQuotes.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">{t('noQuotesYet')}</p>
      )}

      {/* Quote cards */}
      <div className="space-y-4">
        {allQuotes.map((quote) => {
          const isExpanded = expandedQuotes.has(quote.id)
          const selectedTierId = selectedTierIds[quote.id]
          const selectedTier = quote.tiers.find((t) => t.id === selectedTierId) ?? quote.tiers[0]
          const lowestPrice = quote.tiers.length > 0 ? Math.min(...quote.tiers.map((t) => t.price)) : null
          const highestPrice = quote.tiers.length > 0 ? Math.max(...quote.tiers.map((t) => t.price)) : null

          return (
            <div
              key={quote.id}
              className={`border rounded-2xl overflow-hidden ${
                quote.status === 'ACCEPTED'
                  ? 'border-green-300'
                  : quote.status === 'REJECTED'
                  ? 'border-gray-200'
                  : 'border-gray-200'
              }`}
            >
              {/* Quote header — always visible */}
              <button
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedQuotes((prev) => {
                    const next = new Set(prev)
                    if (next.has(quote.id)) next.delete(quote.id)
                    else next.add(quote.id)
                    return next
                  })
                }
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {quote.contractor?.user.name ?? 'Contractor'}
                    </p>
                    {lowestPrice !== null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lowestPrice === highestPrice
                          ? `$${lowestPrice.toLocaleString()}`
                          : `$${lowestPrice.toLocaleString()} – $${highestPrice!.toLocaleString()}`}
                        {' · '}
                        {quote.tiers.length} tier{quote.tiers.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* Cover letter */}
                  <div className="pt-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cover Letter</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{quote.coverLetter}</p>
                  </div>

                  {/* Tier tabs + card */}
                  {quote.tiers.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pricing Options</p>
                      {quote.tiers.length > 1 && (
                        <div className="flex gap-1.5 mb-3 flex-wrap">
                          {quote.tiers.map((tier) => (
                            <button
                              key={tier.id}
                              onClick={() =>
                                setSelectedTierIds((prev) => ({ ...prev, [quote.id]: tier.id }))
                              }
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                selectedTierId === tier.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {tier.name} · ${tier.price.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedTier && <QuoteTierCard tier={selectedTier} />}
                    </div>
                  )}

                  {/* Questions */}
                  {quote.questions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Contractor Questions
                      </p>
                      <div className="space-y-3">
                        {quote.questions.map((q: QuoteQuestion) => (
                          <div key={q.id} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-800 mb-1">Q: {q.question}</p>
                            {q.answer ? (
                              <p className="text-xs text-gray-600">A: {q.answer}</p>
                            ) : (
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={answerInputs[q.id] ?? ''}
                                  onChange={(e) =>
                                    setAnswerInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAnswerQuestion(quote.id, q)
                                  }}
                                  placeholder="Type your answer…"
                                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handleAnswerQuestion(quote.id, q)}
                                  disabled={answeringQuestion === q.id || !(answerInputs[q.id] ?? '').trim()}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  {answeringQuestion === q.id ? '…' : 'Send'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {(quote.files ?? []).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Portfolio</p>
                      <div className="grid grid-cols-4 gap-1.5">
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
                              className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors p-1"
                            >
                              <span className="text-xl">📄</span>
                              <span className="text-xs text-gray-500 truncate w-full text-center">{f.filename}</span>
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accept / Reject */}
                  {quote.status === 'PENDING' && job.status !== 'AWARDED' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                      <button
                        onClick={() => handleAccept(quote)}
                        disabled={actioning === quote.id || !selectedTierId}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {actioning === quote.id
                          ? '…'
                          : selectedTier
                          ? `${t('accept')} — ${selectedTier.name} ($${selectedTier.price.toLocaleString()})`
                          : t('accept')}
                      </button>
                      <button
                        onClick={() => handleReject(quote)}
                        disabled={actioning === quote.id}
                        className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-300 transition-colors"
                      >
                        {t('decline')}
                      </button>
                      {onOpenConversation && quote.contractor && (
                        <button
                          onClick={async () => {
                            setStartingConv(quote.id)
                            try {
                              const res = await fetch(`${API_URL}/jobs/${jobId}/conversations`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ contractorId: quote.contractorId }),
                              })
                              const data = await res.json()
                              if (res.ok) onOpenConversation(data.conversationId)
                            } finally {
                              setStartingConv(null)
                            }
                          }}
                          disabled={startingConv === quote.id}
                          className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors"
                        >
                          {startingConv === quote.id
                            ? '…'
                            : `Message ${quote.contractor.user.name.split(' ')[0]}`}
                        </button>
                      )}
                    </div>
                  )}

                  {quote.status === 'ACCEPTED' && (
                    <div className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-medium text-green-800">
                      ✓ You accepted this quote
                      {selectedTier && ` — ${selectedTier.name} tier`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
