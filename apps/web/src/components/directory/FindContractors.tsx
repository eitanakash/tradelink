import { useEffect, useState } from 'react'
import type { TradeCategory } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { StarRating } from '../StarRating'

interface ContractorListing {
  id: string
  slug: string
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
  const [contractors, setContractors] = useState<ContractorListing[]>([])
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [stateFilter, setStateFilter] = useState('')
  const [tradeFilter, setTradeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (stateFilter.trim()) params.set('state', stateFilter.trim())
    if (tradeFilter) params.set('trade', tradeFilter)
    fetch(`${API_URL}/contractors?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContractors(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d) })
  }, [])

  useEffect(() => {
    load()
  }, [stateFilter, tradeFilter])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Find Contractors</h2>
        <p className="text-sm text-gray-500">Browse verified contractors in your area</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="Filter by state (e.g. CA, TX)"
          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All trades</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : contractors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No contractors found matching your filters.</p>
          {(stateFilter || tradeFilter) && (
            <button
              onClick={() => { setStateFilter(''); setTradeFilter('') }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {contractors.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectContractor(c.slug)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
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
                        Verified
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
                      <span>No reviews yet</span>
                    )}
                    {c.totalJobs > 0 && (
                      <span>{c.totalJobs} job{c.totalJobs !== 1 ? 's' : ''} completed</span>
                    )}
                    <span>{c.state}</span>
                  </div>

                  {c.trades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.trades.map((t) => (
                        <span
                          key={t.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {t.icon} {t.name}
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
