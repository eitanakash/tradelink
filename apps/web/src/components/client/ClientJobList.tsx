import { useEffect, useState } from 'react'
import type { Job } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { timeAgo } from '../../lib/date'
import { SkeletonJobList } from '../Skeleton'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  AWARDED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_ORDER = ['OPEN', 'IN_REVIEW', 'AWARDED', 'COMPLETED', 'CANCELLED']

type SortBy = 'newest' | 'oldest' | 'most-quotes'

interface Props {
  onSelectJob: (id: string) => void
  onPostJob: () => void
}

export function ClientJobList({ onSelectJob, onPostJob }: Props) {
  const { t } = useT()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async (jobId: string) => {
    setDeleting(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
        setConfirmDeleteId(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t('statusOpen'),
    IN_REVIEW: t('statusInReview'),
    AWARDED: t('statusAwarded'),
    COMPLETED: t('statusCompleted'),
    CANCELLED: t('statusCancelled'),
  }

  const categories = Array.from(
    new Map(jobs.map((j) => [j.category.id, j.category])).values(),
  )

  const visible = jobs
    .filter((j) => filterStatus === 'all' || j.status === filterStatus)
    .filter((j) => filterCategory === 'all' || j.category.id === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'oldest')
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'most-quotes')
        return (b._count?.quotes ?? 0) - (a._count?.quotes ?? 0)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const canEdit = (status: string) => ['OPEN', 'IN_REVIEW'].includes(status)

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 animate-pulse bg-gray-200 rounded" />
        <div className="h-9 w-28 animate-pulse bg-gray-200 rounded-lg" />
      </div>
      <SkeletonJobList />
    </div>
  )
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
        <>
          {/* Controls */}
          <div className="mb-5 space-y-3">
            {/* Status pills */}
            <div className="flex flex-wrap gap-1.5">
              {['all', ...STATUS_ORDER].map((s) => {
                const count =
                  s === 'all' ? jobs.length : jobs.filter((j) => j.status === s).length
                if (s !== 'all' && count === 0) return null
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterStatus === s
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_LABELS[s]}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Category filter + sort */}
            <div className="flex gap-2">
              {categories.length > 1 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most-quotes">Most quotes</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400">
              No jobs match your filters.
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((job) =>
                confirmDeleteId === job.id ? (
                  <div
                    key={job.id}
                    className="bg-white border border-red-200 rounded-xl p-5"
                  >
                    <p className="text-sm font-medium text-gray-800 mb-3">
                      Delete{' '}
                      <span className="font-semibold">"{job.title}"</span>? This
                      can't be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                        className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={deleting}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={job.id}
                    onClick={() => onSelectJob(job.id)}
                    className="relative w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
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
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(job.createdAt)}</p>
                      </div>

                      <div className="flex items-start gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status]}`}
                          >
                            {STATUS_LABELS[job.status]}
                          </span>
                          {(job._count?.quotes ?? 0) > 0 && (
                            <span className="text-xs text-gray-500">
                              {job._count!.quotes} quote
                              {job._count!.quotes !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* 3-dots menu */}
                        {canEdit(job.status) && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId((prev) =>
                                  prev === job.id ? null : job.id,
                                )
                              }}
                              className="p-1 -mr-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {openMenuId === job.id && (
                              <>
                                {/* backdrop to catch outside clicks */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuId(null)
                                  }}
                                />
                                <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuId(null)
                                      onSelectJob(job.id)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuId(null)
                                      setConfirmDeleteId(job.id)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
