import { useEffect, useState } from 'react'
import type { Job } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  AWARDED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

interface Props {
  onSelectJob: (id: string) => void
  onPostJob: () => void
}

export function ClientJobList({ onSelectJob, onPostJob }: Props) {
  const { t } = useT()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/jobs?mode=CLIENT`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setJobs(data)
        else setError(data.error ?? 'Failed to load jobs')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t('statusOpen'),
    IN_REVIEW: t('statusInReview'),
    AWARDED: t('statusAwarded'),
    COMPLETED: t('statusCompleted'),
    CANCELLED: t('statusCancelled'),
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loadingDots')}</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('yourJobs')}</h2>
        <button
          onClick={onPostJob}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {t('postAJob')}
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500 mb-6">{t('noJobsYet')}</p>
          <button
            onClick={onPostJob}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t('postAJobBtn')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{job.category.icon}</span>
                    <span className="text-xs text-gray-500">{job.category.name}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {job.city}, {job.state}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status]}`}
                  >
                    {STATUS_LABELS[job.status]}
                  </span>
                  {(job._count?.quotes ?? 0) > 0 && (
                    <span className="text-xs text-gray-500">
                      {job._count!.quotes} quote{job._count!.quotes !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
