import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'
import { US_STATES } from '../../lib/states'
import { useT } from '../../lib/i18n'
import { StarRating } from '../StarRating'

interface Trade {
  id: string
  name: string
  icon: string
}

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
  trades: Trade[]
}

interface Props {
  onSelectContractor: (slugOrId: string) => void
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-yellow-500',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function FindContractors({ onSelectContractor }: Props) {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initialised, setInitialised] = useState(false)
  const [categories, setCategories] = useState<Trade[]>([])
  const [contractors, setContractors] = useState<ContractorListing[]>([])

  const token = localStorage.getItem('token')

  // On mount: fetch categories and first job's state
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.json(),
      ),
      fetch(`${API_URL}/jobs?mode=CLIENT`, { headers: { Authorization: `Bearer ${token}` } }).then(
        (r) => r.json(),
      ),
    ])
      .then(([cats, jobs]) => {
        if (Array.isArray(cats)) setCategories(cats)
        if (Array.isArray(jobs) && jobs.length > 0 && jobs[0].state) {
          setStateFilter(jobs[0].state)
        }
      })
      .catch(() => {})
      .finally(() => setInitialised(true))
  }, [])

  // Fetch contractors when filters change
  useEffect(() => {
    if (!initialised) return
    if (!stateFilter) {
      setContractors([])
      return
    }

    const params = new URLSearchParams({ state: stateFilter })
    if (selectedTradeIds.length === 1) {
      params.set('trade', selectedTradeIds[0])
    }

    setLoading(true)
    fetch(`${API_URL}/contractors?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: ContractorListing[] = data.contractors ?? []
        const filtered =
          selectedTradeIds.length <= 1
            ? list
            : list.filter((c) => c.trades.some((tr) => selectedTradeIds.includes(tr.id)))
        setContractors(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [stateFilter, selectedTradeIds, initialised])

  const toggleTrade = (id: string) => {
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const displayed = contractors.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.user.name.toLowerCase().includes(q) ||
      (c.headline ?? '').toLowerCase().includes(q) ||
      c.trades.some((tr) => tr.name.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('findContractorsTitle')}</h1>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* State filter */}
      <select
        value={stateFilter}
        onChange={(e) => setStateFilter(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{t('selectState')}</option>
        {US_STATES.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Trade pills */}
      {categories.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedTradeIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleTrade(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              )
            })}
          </div>
          {selectedTradeIds.length > 0 && (
            <button
              onClick={() => setSelectedTradeIds([])}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              {t('clearTrades')}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {!stateFilter ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-sm">{t('selectStatePrompt')}</p>
        </div>
      ) : loading ? (
        <p className="text-center py-10 text-gray-400 text-sm">{t('loading')}</p>
      ) : displayed.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm mb-2">{t('noContractorsFound')}</p>
          <button
            onClick={() => {
              setSearch('')
              setSelectedTradeIds([])
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((c) => {
            const initial = c.user.name.charAt(0).toUpperCase()
            const color = avatarColor(c.user.name)
            return (
              <button
                key={c.id}
                onClick={() => onSelectContractor(c.slug ?? c.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{c.user.name}</span>
                      {c.isVerified && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          {t('verified')}
                        </span>
                      )}
                    </div>
                    {c.headline && (
                      <p className="text-sm text-gray-500 truncate mb-1.5">{c.headline}</p>
                    )}
                    {c.trades.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.trades.map((tr) => {
                          const highlighted = selectedTradeIds.includes(tr.id)
                          return (
                            <span
                              key={tr.id}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                highlighted
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {tr.icon} {tr.name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {c.totalReviews > 0 ? (
                        <span className="flex items-center gap-1">
                          <StarRating value={c.averageRating} size="sm" />
                          <span className="font-medium text-gray-700">{c.averageRating.toFixed(1)}</span>
                          <span>({c.totalReviews} {t('reviewsWord')})</span>
                        </span>
                      ) : null}
                      {c.totalJobs > 0 && <span>{c.totalJobs} {t('jobsWord')}</span>}
                      <span>{c.state}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
