import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TradeCategory } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { US_STATES } from '../../lib/states'
import { StarRating } from '../StarRating'

interface ContractorListing {
  id: string
  slug: string | null
  state: string
  headline: string | null
  isVerified: boolean
  averageRating: number
  totalReviews: number
  totalJobs: number
  user: { name: string }
  trades: { id: string; name: string; icon: string }[]
}

interface Props {
  onSelectContractor: (slug: string) => void
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

export function FindContractors({ onSelectContractor }: Props) {
  const { t } = useTranslation()
  const [contractors, setContractors] = useState<ContractorListing[]>([])
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [stateFilter, setStateFilter] = useState('')
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialised, setInitialised] = useState(false)

  // Pre-fill state from the client's most recent job
  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      fetch(`${API_URL}/categories`).then((r) => r.json()),
      token
        ? fetch(`${API_URL}/jobs?mode=CLIENT`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        : Promise.resolve([]),
    ]).then(([cats, jobs]) => {
      if (Array.isArray(cats)) setCategories(cats)
      if (Array.isArray(jobs) && jobs.length > 0 && jobs[0].state) {
        setStateFilter(jobs[0].state)
      }
      setInitialised(true)
    }).catch(() => setInitialised(true))
  }, [])

  const toggleTrade = (id: string) =>
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  useEffect(() => {
    if (!initialised) return
    if (!stateFilter) { setContractors([]); return }
    setLoading(true)
    const params = new URLSearchParams()
    params.set('state', stateFilter)
    if (selectedTradeIds.length === 1) params.set('trade', selectedTradeIds[0])
    fetch(`${API_URL}/contractors?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list: ContractorListing[] = Array.isArray(data?.contractors)
          ? data.contractors
          : Array.isArray(data) ? data : []
        // Client-side filter for multi-trade selection
        const filtered = selectedTradeIds.length > 1
          ? list.filter((c) => c.trades.some((tr) => selectedTradeIds.includes(tr.id)))
          : list
        setContractors(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [stateFilter, selectedTradeIds, initialised])

  const q = search.trim().toLowerCase()
  const displayed = q
    ? contractors.filter(
        (c) =>
          c.user.name.toLowerCase().includes(q) ||
          (c.headline ?? '').toLowerCase().includes(q) ||
          c.trades.some((tr) => tr.name.toLowerCase().includes(q)),
      )
    : contractors

  const hasFilters = !!stateFilter || selectedTradeIds.length > 0 || !!search.trim()

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('directory.findContractors')}</h2>
        <p className="text-sm text-gray-500">{t('directory.browsVerified')}</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, specialty…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* State filter */}
      <div className="mb-4">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{t('directory.filterByState')}</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Trade filter pills */}
      {categories.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('directory.allTrades')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const active = selectedTradeIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleTrade(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              )
            })}
          </div>
          {selectedTradeIds.length > 0 && (
            <button
              onClick={() => setSelectedTradeIds([])}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Clear trades
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {!stateFilter ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="text-3xl mb-3">📍</div>
          <p className="text-gray-700 font-medium">{t('directory.filterByState')}</p>
          <p className="text-sm text-gray-500 mt-1">Select a state above to find contractors in your area.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">{t('directory.noContractors')}</p>
          {hasFilters && (
            <button
              onClick={() => { setStateFilter(''); setSelectedTradeIds([]); setSearch('') }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              {t('directory.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectContractor(c.slug ?? c.id)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full ${avatarColor(c.user.name)} flex items-center justify-center text-white text-lg font-bold shrink-0`}
                >
                  {c.user.name[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900">{c.user.name}</span>
                    {c.isVerified && (
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {t('directory.verified')}
                      </span>
                    )}
                  </div>

                  {c.headline && (
                    <p className="text-sm text-gray-600 mb-1 truncate">{c.headline}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {c.averageRating > 0 ? (
                      <span className="flex items-center gap-1">
                        <StarRating value={c.averageRating} size="sm" />
                        <span className="font-medium text-gray-700">{c.averageRating.toFixed(1)}</span>
                        <span>({c.totalReviews})</span>
                      </span>
                    ) : (
                      <span>{t('directory.noReviews')}</span>
                    )}
                    {c.totalJobs > 0 && (
                      <span>{t('directory.jobsCompleted', { count: c.totalJobs })}</span>
                    )}
                    <span>{c.state}</span>
                  </div>

                  {c.trades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.trades.map((tr) => (
                        <span
                          key={tr.id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            selectedTradeIds.includes(tr.id)
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tr.icon} {tr.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-gray-400 text-sm shrink-0">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
