import { useEffect, useState } from 'react'
import type { ContractorPublicProfile } from '@tradelink/types'
import { API_URL } from '../../lib/api'
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

interface Props {
  slug: string
  onBack: () => void
}

export function ContractorPublicProfilePage({ slug, onBack }: Props) {
  const [profile, setProfile] = useState<ContractorPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`${API_URL}/contractors/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setProfile(data)
        else setError(data.error ?? 'Not found')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error || !profile) {
    return (
      <div>
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
          ← Back
        </button>
        <div className="text-center py-20 text-red-500">{error || 'Profile not found'}</div>
      </div>
    )
  }

  const photoFiles = profile.profileFiles.filter((f) => f.category === 'PROFILE_PHOTO')
  const hasBreakdown =
    profile.ratingBreakdown &&
    (profile.ratingBreakdown.quality > 0 ||
      profile.ratingBreakdown.communication > 0 ||
      profile.ratingBreakdown.timeliness > 0 ||
      profile.ratingBreakdown.value > 0)

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
        ← Back to contractors
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
                  Verified
                </span>
              )}
            </div>
            {profile.headline && (
              <p className="text-gray-600 text-sm mb-2">{profile.headline}</p>
            )}
            <p className="text-sm text-gray-500">{profile.state}</p>
            {profile.trades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.trades.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                  >
                    {t.icon} {t.name}
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
            <p className="text-xs text-gray-500">{profile.totalReviews} review{profile.totalReviews !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{profile.totalJobs}</p>
            <p className="text-xs text-gray-500">Jobs completed</p>
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
          <h2 className="font-semibold text-gray-900 mb-3">Portfolio</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photoFiles.map((f) => (
              <img
                key={f.id}
                src={f.url}
                alt={f.filename}
                className="aspect-square object-cover rounded-xl border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Reviews ({profile.totalReviews})
        </h2>

        {profile.reviews.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No reviews yet.</p>
        ) : (
          <div className="space-y-6">
            {profile.reviews.map((review) => (
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

                {/* Contractor reply */}
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
        )}
      </div>
    </div>
  )
}
