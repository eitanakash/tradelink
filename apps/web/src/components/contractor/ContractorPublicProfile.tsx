import { useEffect, useState } from 'react'
import type { ContractorPublicProfile, Review } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { formatDateTime } from '../../lib/date'
import { StarRating } from '../StarRating'

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function avatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length < 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

type ReviewFilter = 'all' | 5 | 4 | 3

interface Props {
  slugOrId: string
  onBack: () => void
}

export function ContractorPublicProfile({ slugOrId, onBack }: Props) {
  const { t } = useT()
  const [profile, setProfile] = useState<ContractorPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/contractors/${slugOrId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setProfile(data)
        else setError(data.error ?? 'Not found')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [slugOrId])

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (error || !profile) {
    return (
      <div>
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
          {t('back')}
        </button>
        <div className="text-center py-20 text-red-500">{error || 'Profile not found'}</div>
      </div>
    )
  }

  const photoFiles = profile.profileFiles.filter((f) => f.category === 'PROFILE_PHOTO')
  const docFiles = profile.profileFiles.filter((f) => f.category === 'PROFILE_DOCUMENT')
  const hasBreakdown =
    profile.ratingBreakdown &&
    (profile.ratingBreakdown.quality > 0 ||
      profile.ratingBreakdown.communication > 0 ||
      profile.ratingBreakdown.timeliness > 0 ||
      profile.ratingBreakdown.value > 0)

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
        {t('back')}
      </button>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`w-16 h-16 rounded-full ${avatarColor(profile.user.name)} flex items-center justify-center text-white text-2xl font-bold shrink-0`}
          >
            {profile.user.name[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.user.name}</h1>
              {profile.isVerified && (
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {t('verified')}
                </span>
              )}
            </div>
            {profile.headline && (
              <p className="text-gray-600 text-sm mb-2">{profile.headline}</p>
            )}
            <p className="text-sm text-gray-500">{profile.state}</p>
            {profile.trades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.trades.map((tr) => (
                  <span
                    key={tr.id}
                    className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                  >
                    {tr.icon} {tr.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <StarRating value={profile.averageRating} size="sm" />
              <span className="text-sm font-semibold text-gray-900">{profile.averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">{profile.totalReviews} {t('reviewsWord')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{profile.totalJobs}</p>
            <p className="text-xs text-gray-500">{t('jobsCompleted')}</p>
          </div>
          {profile.yearsExperience != null && (
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{profile.yearsExperience}</p>
              <p className="text-xs text-gray-500">Years experience</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500">Member since</p>
          </div>
        </div>

        {/* Contact links */}
        {(profile.website || profile.phone) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Website
              </a>
            )}
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="text-sm text-blue-600 hover:underline">
                {profile.phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Rating breakdown */}
      {hasBreakdown && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h2>
          <div className="space-y-3">
            <RatingBar label="Quality of Work" value={profile.ratingBreakdown.quality} />
            <RatingBar label="Communication" value={profile.ratingBreakdown.communication} />
            <RatingBar label="Timeliness" value={profile.ratingBreakdown.timeliness} />
            <RatingBar label="Value for Money" value={profile.ratingBreakdown.value} />
          </div>
        </div>
      )}

      {/* Portfolio photos */}
      {photoFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">{t('portfolio')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photoFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => setLightboxUrl(f.url)}
                className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
              >
                <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {docFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Licenses & Documents</h2>
          <div className="space-y-2">
            {docFiles.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <span className="text-xl">📄</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{f.filename}</span>
                <span className="text-xs text-blue-600">Download</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Reviews ({profile.totalReviews})</h2>
        </div>

        {/* Star distribution */}
        {profile.reviews.length > 0 && (
          <div className="mb-5 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{profile.averageRating.toFixed(1)}</p>
                <StarRating value={profile.averageRating} size="sm" />
                <p className="text-xs text-gray-500 mt-1">{profile.totalReviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = profile.reviews.filter((r: Review) => r.rating === stars).length
                  const pct = profile.reviews.length > 0 ? (count / profile.reviews.length) * 100 : 0
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-3">{stars}</span>
                      <span className="text-yellow-400 text-xs">★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-yellow-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {profile.reviews.length > 0 && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {(['all', 5, 4, 3] as ReviewFilter[]).map((f) => {
              const count = f === 'all'
                ? profile.reviews.length
                : f === 3
                  ? profile.reviews.filter((r: Review) => r.rating <= 3).length
                  : profile.reviews.filter((r: Review) => r.rating === f).length
              if (f !== 'all' && count === 0) return null
              return (
                <button
                  key={String(f)}
                  onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    reviewFilter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 3 ? '3★ & below' : `${f}★`}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {(() => {
          const filtered = reviewFilter === 'all'
            ? profile.reviews
            : reviewFilter === 3
              ? profile.reviews.filter((r: Review) => r.rating <= 3)
              : profile.reviews.filter((r: Review) => r.rating === reviewFilter)

          if (profile.reviews.length === 0) {
            return <p className="text-sm text-gray-500 text-center py-6">{t('noReviewsYet')}</p>
          }
          if (filtered.length === 0) {
            return <p className="text-sm text-gray-400 text-center py-6">No reviews match this filter.</p>
          }
          return (
            <div className="space-y-6">
              {filtered.map((review: Review) => (
                <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <StarRating value={review.rating} size="sm" />
                      <p className="font-semibold text-gray-900 text-sm mt-1">{review.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">
                        {review.author ? anonymizeName(review.author.name) : 'Client'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(review.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>
                  {review.contractorReply && (
                    <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Contractor's Reply
                        {review.contractorRepliedAt && (
                          <span className="font-normal ml-1">· {formatDateTime(review.contractorRepliedAt)}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.contractorReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Photo lightbox */}
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
    </div>
  )
}
