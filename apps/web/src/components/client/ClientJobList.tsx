import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Job } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { timeAgo } from '../../lib/date'

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

function JobCardMenu({
  job,
  onEdit,
  onDelete,
}: {
  job: Job
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleDelete = async () => {
    setDeleting(true)
    const token = localStorage.getItem('token')
    try {
      await fetch(`${API_URL}/jobs/${job.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen(v => !v); setConfirmDelete(false) }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="More options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          {!confirmDelete ? (
            <>
              <button
                onClick={() => { setOpen(false); onEdit() }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('common.edit')}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('common.delete')}
              </button>
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-600 mb-2">{t('clientJobList.confirmDelete')}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
                >
                  {deleting ? '…' : t('clientJobList.deleteConfirmBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ClientJobList({ onSelectJob, onPostJob }: Props) {
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statusLabel = (s: string) => t(`status.${s}`, { defaultValue: s })

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/jobs?mode=CLIENT`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setJobs(data)
        else setError(data.error ?? t('clientJobList.failedLoad'))
      })
      .catch(() => setError(t('clientJobList.networkError')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('clientJobList.yourJobs')}</h2>
        <button
          onClick={onPostJob}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {t('clientJobList.postJob')}
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500 mb-6">{t('clientJobList.noJobsYet')}</p>
          <button
            onClick={onPostJob}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t('clientJobList.postFirstJob')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="relative bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
            >
              {/* Clickable main area */}
              <button
                onClick={() => onSelectJob(job.id)}
                className="w-full text-left p-5 pr-12"
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
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status]}`}>
                      {statusLabel(job.status)}
                    </span>
                    {(job._count?.quotes ?? 0) > 0 && (
                      <span className="text-xs text-gray-500">
                        {t('clientJobList.quotes', { count: job._count!.quotes })}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* 3-dot menu */}
              <div className="absolute top-4 right-4">
                <JobCardMenu
                  job={job}
                  onEdit={() => onSelectJob(job.id)}
                  onDelete={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
