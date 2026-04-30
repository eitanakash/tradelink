import { useEffect, useState } from 'react'
import type { ContractorProfileData, FileUploadRecord, TradeCategory, Review } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { FileUpload } from '../FileUpload'
import { StarRating } from '../StarRating'
import { formatDateTime } from '../../lib/date'

export function ContractorProfile() {
  const { t } = useT()
  const [profile, setProfile] = useState<ContractorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<FileUploadRecord[]>([])
  const [docs, setDocs] = useState<FileUploadRecord[]>([])

  // Trades
  const [allCategories, setAllCategories] = useState<TradeCategory[]>([])
  const [showTradeEditor, setShowTradeEditor] = useState(false)
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [savingTrades, setSavingTrades] = useState(false)

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // Edit state
  const [editingInfo, setEditingInfo] = useState(false)
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [saveError, setSaveError] = useState('')

  const token = localStorage.getItem('token')

  const loadProfile = () => {
    fetch(`${API_URL}/contractor/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setProfile(data)
          setSelectedTradeIds(data.trades.map((tr: TradeCategory) => tr.id))
          setPhotos((data.profileFiles ?? []).filter((f: FileUploadRecord) => f.category === 'PROFILE_PHOTO'))
          setDocs((data.profileFiles ?? []).filter((f: FileUploadRecord) => f.category === 'PROFILE_DOCUMENT'))
        } else {
          setError(data.error ?? 'Failed to load profile')
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfile()
    fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllCategories(data) })
    fetch(`${API_URL}/contractor/reviews`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReviews(data) })
  }, [])

  const toggleTrade = (id: string) =>
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const saveTrades = async () => {
    setSavingTrades(true)
    try {
      const res = await fetch(`${API_URL}/contractor/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tradeIds: selectedTradeIds }),
      })
      const data = await res.json()
      if (data.id) {
        setProfile((p) => p ? { ...p, trades: data.trades } : p)
        setShowTradeEditor(false)
      }
    } finally {
      setSavingTrades(false)
    }
  }

  const startEdit = () => {
    if (!profile) return
    setHeadline(profile.headline ?? '')
    setBio(profile.bio ?? '')
    setYearsExperience(profile.yearsExperience != null ? String(profile.yearsExperience) : '')
    setWebsite(profile.website ?? '')
    setPhone(profile.phone ?? '')
    setSaveError('')
    setEditingInfo(true)
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingInfo(true)
    setSaveError('')
    try {
      const res = await fetch(`${API_URL}/contractor/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : null,
          website: website.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error ?? 'Failed to save'); return }
      setProfile(data)
      setEditingInfo(false)
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      const res = await fetch(`${API_URL}/reviews/${reviewId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, contractorReply: data.contractorReply, contractorRepliedAt: data.contractorRepliedAt } : r))
        setReplyingTo(null)
        setReplyText('')
      }
    } finally {
      setSubmittingReply(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (error || !profile) return <div className="text-center py-20 text-red-500">{error}</div>

  const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('yourProfile')}</h2>
        <p className="text-sm text-gray-500">
          {profile.state} · {profile.trades.map((tr) => `${tr.icon} ${tr.name}`).join(' · ') || t('noTradesSelected')}
        </p>
      </div>

      {/* Public profile link */}
      {profile.slug && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-700 font-medium">Your public profile: </span>
          <span className="text-blue-600">/contractors/{profile.slug}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <StarRating value={profile.averageRating} size="sm" />
          </div>
          <p className="text-lg font-bold text-gray-900">{profile.averageRating.toFixed(1)}</p>
          <p className="text-xs text-gray-500">{profile.totalReviews} {t('reviewsWord')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-gray-900">{profile.totalJobs}</p>
          <p className="text-xs text-gray-500">{t('jobsCompleted')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          {profile.isVerified ? (
            <>
              <p className="text-sm font-semibold text-blue-600">{t('verified')}</p>
              <p className="text-xs text-gray-500">Contractor</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-400">Unverified</p>
              <p className="text-xs text-gray-500">Contractor</p>
            </>
          )}
        </div>
      </div>

      {/* Trades */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t('yourTrades')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {(profile.trades.length === 0)
                ? t('noTradesSelected')
                : profile.trades.map((tr) => `${tr.icon} ${tr.name}`).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTradeEditor(!showTradeEditor)}
            className="text-sm text-violet-600 hover:underline"
          >
            {showTradeEditor ? t('cancel') : t('editBtn')}
          </button>
        </div>

        {showTradeEditor && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleTrade(cat.id)}
                  className={`flex items-center gap-2 p-2.5 border rounded-lg text-sm transition-all ${
                    selectedTradeIds.includes(cat.id)
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="font-medium truncate">{cat.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={saveTrades}
              disabled={savingTrades}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {savingTrades ? t('savingTrades') : t('saveTrades')}
            </button>
          </div>
        )}
      </section>

      {/* Profile info */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Profile Info</h3>
          {!editingInfo && (
            <button
              onClick={startEdit}
              className="text-sm text-violet-600 hover:underline"
            >
              {t('editBtn')}
            </button>
          )}
        </div>

        {editingInfo ? (
          <form onSubmit={handleSaveInfo} className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5">
            {saveError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div>
              <label className={labelCls}>Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Licensed Electrician with 10+ years experience"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients about yourself and your work"
                rows={4}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="e.g. 10"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditingInfo(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingInfo}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {savingInfo ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            {profile.headline ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Headline</p>
                <p className="text-sm text-gray-800">{profile.headline}</p>
              </div>
            ) : null}
            {profile.bio ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Bio</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              {profile.yearsExperience != null && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Experience</p>
                  <p className="text-sm text-gray-800">{profile.yearsExperience} years</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Phone</p>
                  <p className="text-sm text-gray-800">{profile.phone}</p>
                </div>
              )}
              {profile.website && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Website</p>
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
            {!profile.headline && !profile.bio && profile.yearsExperience == null && !profile.phone && !profile.website && (
              <p className="text-sm text-gray-400 italic">No profile info added yet. Click Edit to add details.</p>
            )}
          </div>
        )}
      </section>

      {/* Portfolio photos */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('portfolioSectionTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('portfolioSectionHint')}</p>
        <FileUpload
          category="PROFILE_PHOTO"
          existingFiles={photos}
          onUploaded={(f) => setPhotos((prev) => [...prev, f])}
          onRemoved={(id) => setPhotos((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={20}
          accept="image/*"
          label={t('addPortfolioPhotos')}
        />
      </section>

      {/* Documents */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('documentsSectionTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('documentsSectionHint')}</p>
        <FileUpload
          category="PROFILE_DOCUMENT"
          existingFiles={docs}
          onUploaded={(f) => setDocs((prev) => [...prev, f])}
          onRemoved={(id) => setDocs((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={5}
          accept="application/pdf"
          label={t('addDocumentsLabel')}
        />
      </section>

      {/* Reviews */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-3">Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 bg-white border border-gray-200 rounded-2xl">
            No reviews yet. Complete jobs to receive client reviews.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <StarRating value={review.rating} size="sm" />
                    <p className="font-semibold text-gray-900 text-sm mt-1">{review.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">
                      {review.author
                        ? `${review.author.name.split(' ')[0]} ${review.author.name.split(' ').slice(-1)[0]?.[0] ?? ''}.`
                        : 'Client'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(review.createdAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.body}</p>

                {/* Existing reply */}
                {review.contractorReply && (
                  <div className="pl-4 border-l-2 border-gray-200 mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Your Reply</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.contractorReply}</p>
                  </div>
                )}

                {/* Reply form */}
                {!review.contractorReply && replyingTo !== review.id && (
                  <button
                    onClick={() => { setReplyingTo(review.id); setReplyText('') }}
                    className="text-sm text-violet-600 hover:underline"
                  >
                    Reply to this review
                  </button>
                )}
                {replyingTo === review.id && (
                  <div className="mt-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a professional reply…"
                      rows={3}
                      className={`${inputCls} resize-none mb-2`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReply(review.id)}
                        disabled={submittingReply || !replyText.trim()}
                        className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {submittingReply ? 'Submitting…' : 'Submit Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
