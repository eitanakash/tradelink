import { useEffect, useRef, useState } from 'react'
import type { TradeCategory, JobSummary } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { US_STATES } from '../../lib/states'
import { useT } from '../../lib/i18n'

interface Props {
  onClose: () => void
  onCreated: (jobId: string) => void
}

type Step = 'category' | 'chat' | 'review' | 'manual'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  quickReplies?: string[]
  attachments?: { name: string; preview: string; isImage: boolean }[]
}

const COMPLEXITY_STYLES = {
  simple: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  complex: 'bg-red-100 text-red-700',
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
        🔧
      </div>
      <div className="flex gap-1 items-center px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      </div>
    </div>
  )
}

export function PostJobModal({ onClose, onCreated }: Props) {
  const { t } = useT()
  const [step, setStep] = useState<Step>('category')
  const [categories, setCategories] = useState<TradeCategory[]>([])

  // chat state
  const [sessionId, setSessionId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null)
  const [chatError, setChatError] = useState('')

  // review / confirm state
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  // manual form state
  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualState, setManualState] = useState('')
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualPendingFiles, setManualPendingFiles] = useState<File[]>([])
  const manualFileRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, waiting])

  const userTurns = messages.filter((m) => m.role === 'user').length
  const progress = isComplete
    ? 100
    : Math.min(88, 8 + userTurns * 16)

  const handleSelectCategory = async (cat: TradeCategory) => {
    setSelectedCategory(cat)
    setWaiting(true)
    setStep('chat')
    try {
      const res = await fetch(`${API_URL}/ai/intake/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categoryId: cat.id }),
      })
      const data = await res.json()
      if (!res.ok) { setChatError(data.error ?? 'Failed to start session'); return }
      setSessionId(data.sessionId)
      setMessages([{ role: 'assistant', content: data.firstMessage, quickReplies: data.quickReplies }])
    } catch {
      setChatError('Network error. Please try again.')
    } finally {
      setWaiting(false)
    }
  }

  const handleSend = async (quickReply?: string) => {
    const text = quickReply?.trim() || input.trim()
    if (!text && pendingFiles.length === 0) return
    if (waiting) return

    const filesToSend = [...pendingFiles]

    const attachmentPreviews = filesToSend.map((f) => ({
      name: f.name,
      preview: URL.createObjectURL(f),
      isImage: f.type.startsWith('image/'),
    }))

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text || '(attached files)', attachments: attachmentPreviews },
    ])
    setInput('')
    setPendingFiles([])
    setWaiting(true)
    setChatError('')

    try {
      // Upload images to storage, send URLs to AI (avoids base64 in JSON body)
      const imageUrls: Array<{ url: string; mimeType: string }> = []
      for (const f of filesToSend.filter((f) => f.type.startsWith('image/'))) {
        const form = new FormData()
        form.append('file', f)
        form.append('category', 'JOB_PHOTO')
        if (sessionId) form.append('sessionId', sessionId)
        const up = await fetch(`${API_URL}/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (up.ok) {
          const d = await up.json()
          imageUrls.push({ url: d.url, mimeType: d.mimeType })
        }
      }

      const res = await fetch(`${API_URL}/ai/intake/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, message: text || 'See attached files.', imageUrls }),
      })
      const data = await res.json()
      if (!res.ok) { setChatError(data.error ?? 'Something went wrong'); return }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, quickReplies: data.quickReplies },
      ])

      if (data.isComplete) {
        setIsComplete(true)
        setJobSummary(data.jobSummary)
      } else {
        setIsComplete(false)
        setJobSummary(null)
      }
    } catch {
      setChatError('Network error. Please try again.')
    } finally {
      setWaiting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) setPendingFiles((prev) => [...prev, ...files])
  }

  const handleConfirm = async () => {
    if (!address || !city || !state) return
    setConfirming(true)
    setConfirmError('')
    try {
      const res = await fetch(`${API_URL}/ai/intake/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, address, city, state }),
      })
      const data = await res.json()
      if (!res.ok) { setConfirmError(data.error ?? 'Failed to create job'); return }
      onCreated(data.jobId)
    } catch {
      setConfirmError('Network error. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    setManualSubmitting(true)
    setManualError('')
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: manualTitle,
          description: manualDescription,
          address: manualAddress,
          city: manualCity,
          state: manualState,
          categoryId: selectedCategory.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setManualError(data.error ?? 'Failed to create job'); return }
      const jobId: string = data.id
      for (const file of manualPendingFiles) {
        const form = new FormData()
        form.append('file', file)
        form.append('category', 'JOB_PHOTO')
        form.append('jobId', jobId)
        await fetch(`${API_URL}/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
      }
      onCreated(jobId)
    } catch {
      setManualError('Network error. Please try again.')
    } finally {
      setManualSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ height: step === 'chat' || step === 'manual' ? '85vh' : 'auto', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === 'category' && t('postJobTitle')}
                {step === 'chat' && (selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : t('aiIntake'))}
                {step === 'review' && t('reviewRequest')}
                {step === 'manual' && (selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : t('postJobTitle'))}
              </h2>
              {step === 'chat' && (
                <p className="text-xs text-gray-400 mt-0.5">{t('describingProject')}</p>
              )}
              {step === 'manual' && (
                <p className="text-xs text-gray-400 mt-0.5">{t('fillManually')}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'chat' && (
                <button
                  onClick={() => setStep('manual')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {t('skipAI')}
                </button>
              )}
              {step === 'manual' && (
                <button
                  onClick={() => setStep('chat')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {t('backToAI')}
                </button>
              )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              ✕
            </button>
            </div>
          </div>

          {/* Progress bar (chat + review only) */}
          {(step === 'chat' || step === 'review') && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{t('intakeProgress')}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 1 — Category grid */}
        {step === 'category' && (
          <div className="p-6 overflow-y-auto">
            <p className="text-sm text-gray-500 mb-4">{t('whatTypeOfWork')}</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — AI Chat */}
        {step === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
              {chatError && (
                <div className="mx-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
                  {chatError}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 mb-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
                      🔧
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {msg.attachments.map((att, j) =>
                          att.isImage ? (
                            <img
                              key={j}
                              src={att.preview}
                              alt={att.name}
                              className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                            />
                          ) : (
                            <div
                              key={j}
                              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl text-xs text-gray-600"
                            >
                              📄 {att.name}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}
                      >
                        {msg.content}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.quickReplies?.length === 4 && (
                      <div className="grid w-full grid-cols-2 gap-2 pt-1">
                        {msg.quickReplies.map((option) => {
                          const isLatestQuestion = i === messages.length - 1 && !waiting && !isComplete
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSend(option)}
                              disabled={!isLatestQuestion}
                              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white"
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {waiting && <TypingIndicator />}

              {/* Complete banner */}
              {isComplete && !waiting && (
                <div className="mx-1 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center mt-2">
                  <p className="text-sm font-medium text-blue-800 mb-3">
                    {t('readyToReview')}
                  </p>
                  <button
                    onClick={() => setStep('review')}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {t('reviewAndConfirm')}
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Pending file previews */}
            {pendingFiles.length > 0 && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative">
                    {f.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                        📄 {f.name.slice(0, 12)}…
                      </div>
                    )}
                    <button
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                  title="Attach files"
                >
                  📎
                </button>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.mp4" className="hidden" onChange={handleFileChange} />

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('typeYourMessage')}
                  rows={1}
                  disabled={waiting}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
                  style={{ maxHeight: '100px', overflowY: 'auto' }}
                />

                <button
                  className="p-2.5 text-gray-300 rounded-lg shrink-0 cursor-not-allowed"
                  title="Voice input (coming in Phase 5)"
                  disabled
                >
                  🎤
                </button>

                <button
                  onClick={() => handleSend()}
                  disabled={waiting || (!input.trim() && pendingFiles.length === 0)}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3 — Review & Confirm */}
        {step === 'review' && jobSummary && (
          <div className="overflow-y-auto p-6 space-y-5">
            {confirmError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {confirmError}
              </div>
            )}

            {/* Summary card */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 text-base">{jobSummary.title}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 capitalize ${COMPLEXITY_STYLES[jobSummary.estimatedComplexity]}`}
                >
                  {jobSummary.estimatedComplexity}
                </span>
              </div>

              <p className="text-sm text-gray-600">{jobSummary.description}</p>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('scopeOfWork')}</p>
                <ul className="space-y-1">
                  {(jobSummary.scopeOfWork ?? []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('property')}</p>
                  <p className="text-gray-700">{jobSummary.propertyDetails.type}</p>
                  {jobSummary.propertyDetails.size && <p className="text-gray-500 text-xs">{jobSummary.propertyDetails.size}</p>}
                  {jobSummary.propertyDetails.floors && <p className="text-gray-500 text-xs">{jobSummary.propertyDetails.floors}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('timeline')}</p>
                  <p className="text-gray-700">{jobSummary.timeline}</p>
                </div>
              </div>

              {(jobSummary.specialRequirements ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('specialRequirements')}</p>
                  <ul className="space-y-0.5">
                    {jobSummary.specialRequirements.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Location form */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">{t('whereIsJob')}</p>
              <div>
                <label className={labelCls}>{t('streetAddress')}</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('streetAddressPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('cityLabel')}</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('cityPlaceholder')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('stateLabel')}</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('selectStatePlaceholder')}</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep('chat')}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('keepChatting')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || !address || !city || !state}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {confirming ? t('posting') : t('postJobBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Step — Manual form */}
        {step === 'manual' && (
          <div className="overflow-y-auto p-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {manualError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {manualError}
                </div>
              )}
              <div>
                <label className={labelCls}>{t('jobTitleLabel')}</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={t('jobTitlePlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('descriptionLabel')}</label>
                <textarea
                  required
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder={t('describeJob')}
                  rows={4}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div>
                <label className={labelCls}>{t('streetAddress')}</label>
                <input
                  type="text"
                  required
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder={t('streetAddressPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('cityLabel')}</label>
                  <input
                    type="text"
                    required
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder={t('cityPlaceholder')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('stateLabel')}</label>
                  <select
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">{t('selectStatePlaceholder')}</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inline photo picker */}
              <div>
                <label className={labelCls}>{t('addPhotosOrDocs')} <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  ref={manualFileRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,video/mp4,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (files.length) setManualPendingFiles((prev) => [...prev, ...files])
                    e.target.value = ''
                  }}
                />
                {manualPendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {manualPendingFiles.map((f, i) => (
                      <div key={i} className="relative">
                        {f.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(f)}
                            alt={f.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 h-16">
                            📄 {f.name.slice(0, 14)}…
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setManualPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => manualFileRef.current?.click()}
                  className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl text-sm text-gray-500 hover:text-gray-600 transition-colors"
                >
                  📎 Add photos or documents
                </button>
              </div>

              <button
                type="submit"
                disabled={manualSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
              >
                {manualSubmitting
                  ? (manualPendingFiles.length > 0 ? 'Uploading…' : t('posting'))
                  : t('postJobBtn')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
