import { useEffect, useState } from 'react'
import type { Job, TradeCategory, ContractorProfileData } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { timeAgo } from '../../lib/date'

interface Props {
  onSelectJob: (id: string) => void
}

export function ContractorJobFeed({ onSelectJob }: Props) {
  const { t } = useT()
  const [jobs, setJobs] = useState<Job[]>([])
  const [profile, setProfile] = useState<ContractorProfileData | null>(null)
  const [allCategories, setAllCategories] = useState<TradeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingTrades, setSavingTrades] = useState(false)
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [showTradeEditor, setShowTradeEditor] = useState(false)

  const token = localStorage.getItem('token')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_URL}/jobs?mode=CONTRACTOR`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/contractor/profile`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([jobsData, profileData, catsData]) => {
        if (Array.isArray(jobsData)) setJobs(jobsData)
        if (profileData.id) {
          setProfile(profileData)
          setSelectedTradeIds(profileData.trades.map((t: TradeCategory) => t.id))
        }
        if (Array.isArray(catsData)) setAllCategories(catsData)
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleTrade = (id: string) => {
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const saveTrades = async () => {
    setSavingTrades(true)
    try {
      await fetch(`${API_URL}/contractor/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tradeIds: selectedTradeIds }),
      })
      setShowTradeEditor(false)
      load()
    } finally {
      setSavingTrades(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  const hasNoTrades = (profile?.trades.length ?? 0) === 0

  return (
    <div>
      {/* Trade settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t('yourTrades')}</h3>
            <p className="text-sm text-gray-500">
              {hasNoTrades
                ? t('selectTradesPrompt')
                : profile!.trades.map((tr) => `${tr.icon} ${tr.name}`).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => setShowTradeEditor(!showTradeEditor)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            {showTradeEditor ? t('cancel') : t('editBtn')}
          </button>
        </div>

        {showTradeEditor && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
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
              onClick={saveTrades}
              disabled={savingTrades}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {savingTrades ? t('savingTrades') : t('saveTrades')}
            </button>
          </div>
        )}
      </div>

      {/* Job feed */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {t('openJobsIn')} {profile?.state ?? t('yourArea')}
      </h2>

      {hasNoTrades && (
        <div className="text-center py-12 bg-violet-50 rounded-2xl border border-violet-100">
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-600 font-medium mb-1">{t('selectTradesToSeeJobs')}</p>
          <p className="text-sm text-gray-500">
            {t('useTradeEditorHint')}
          </p>
        </div>
      )}

      {!hasNoTrades && jobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('noOpenJobsNearby')}
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
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
    </div>
  )
}
