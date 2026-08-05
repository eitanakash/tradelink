import { useEffect, useState } from 'react'
import type { Job, ContractorProfileData } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { timeAgo } from '../../lib/date'
import { SkeletonJobList } from '../Skeleton'

interface Props {
  onSelectJob: (id: string) => void
}

export function ContractorJobFeed({ onSelectJob }: Props) {
  const { t } = useT()
  const [jobs, setJobs] = useState<Job[]>([])
  const [profile, setProfile] = useState<ContractorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_URL}/jobs?mode=CONTRACTOR`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/contractor/profile`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([jobsData, profileData]) => {
        if (Array.isArray(jobsData)) setJobs(jobsData)
        if (profileData.id) setProfile(profileData)
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      <div className="h-7 w-48 animate-pulse bg-gray-200 rounded mb-4" />
      <SkeletonJobList />
    </div>
  )
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  const isUnverified = profile ? !profile.isVerified : false
  const hasNoTrades = (profile?.trades.length ?? 0) === 0

  return (
    <div>
      {/* Job feed */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {t('openJobsIn')} {profile?.state ?? t('yourArea')}
      </h2>

      {isUnverified ? (
        <div className="text-center py-12 bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <div className="text-4xl mb-3">⏳</div>
          <h3 className="text-amber-900 font-bold text-lg mb-1">Account Pending Approval</h3>
          <p className="text-amber-800 text-sm max-w-md mx-auto">
            Your contractor profile is currently pending review by an administrator. Once approved, you will be able to view available jobs and submit quotes.
          </p>
        </div>
      ) : (
        <>
          {hasNoTrades && (
            <div className="text-center py-12 bg-violet-50 rounded-2xl border border-violet-100">
              <div className="text-4xl mb-3">🔧</div>
              <p className="text-gray-600 font-medium mb-1">{t('selectTradesToSeeJobs')}</p>
              <p className="text-sm text-gray-500">{t('useTradeEditorHint')}</p>
            </div>
          )}

          {!hasNoTrades && jobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('noOpenJobsNearby')}
            </div>
          )}

          <div className="space-y-3">
            {!hasNoTrades && jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{job.category.icon}</span>
                      <span className="text-xs text-gray-500">{job.category.name}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {job.city}, {job.state} · {job.client?.user.name} · {timeAgo(job.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">
                      Open
                    </span>
                    {(job._count?.quotes ?? 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {job._count!.quotes} quote{job._count!.quotes !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
