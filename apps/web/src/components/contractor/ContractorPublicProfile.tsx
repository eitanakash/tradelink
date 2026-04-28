import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'

interface Trade {
  id: string
  name: string
  icon: string
}

interface Review {
  id: string
  rating: number
  title: string
  body: string
  author: { name: string }
  createdAt: string
}

interface ProfileFile {
  id: string
  url: string
  mimeType: string
  filename: string
  category: string
}

interface ContractorProfile {
  id: string
  slug: string | null
  state: string
  headline: string | null
  bio: string | null
  isVerified: boolean
  averageRating: number
  totalReviews: number
  totalJobs: number
  user: { name: string }
  trades: Trade[]
  reviews: Review[]
  profileFiles: ProfileFile[]
}

interface Props {
  slugOrId: string
  onBack: () => void
}

export function ContractorPublicProfile({ slugOrId, onBack }: Props) {
  const { t } = useT()
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/contractors/${slugOrId}`, {
      headers: { Authorization: `Bearer ${token}` },
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
      <div className="text-center py-20 text-red-500">
        <p>{error || 'Contractor not found'}</p>
        <button onClick={onBack} className="mt-4 text-sm text-blue-600 hover:underline">
          {t('back')}
        </button>
      </div>
    )
  }

  const photos = profile.profileFiles.filter((f) => f.mimeType.startsWith('image/'))

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1"
      >
        {t('back')}
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.user.name}</h1>
              {profile.isVerified && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {t('verified')}
                </span>
              )}
            </div>
            {profile.headline && (
              <p className="text-gray-600 text-sm mb-1">{profile.headline}</p>
            )}
            <p className="text-xs text-gray-400">{profile.state}</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {profile.trades.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.trades.map((t) => (
              <span
                key={t.id}
                className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
              >
                {t.icon} {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          {profile.totalReviews > 0 && (
            <span>
              ⭐ {profile.averageRating.toFixed(1)} ({profile.totalReviews} {t('reviewsWord')})
            </span>
          )}
          {profile.totalJobs > 0 && <span>{profile.totalJobs} {t('jobsCompleted')}</span>}
        </div>
      </div>

      {/* Portfolio photos */}
      {photos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">{t('portfolio')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((f) => (
              <div
                key={f.id}
                className="aspect-square rounded-xl overflow-hidden border border-gray-200"
              >
                <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {profile.reviews.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Reviews ({profile.reviews.length})
          </h2>
          <div className="space-y-3">
            {profile.reviews.map((r) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{r.title}</span>
                  <span className="text-sm text-gray-500">
                    {'⭐'.repeat(Math.round(r.rating))}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{r.body}</p>
                <p className="text-xs text-gray-400">— {r.author.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.reviews.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-6">{t('noReviewsYet')}</p>
      )}
    </div>
  )
}
