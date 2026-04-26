import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'

interface QuoteWithJob {
  id: string
  amount: number
  notes: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  job: {
    id: string
    title: string
    city: string
    state: string
    status: string
    category: { icon: string; name: string }
  }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-500',
}

interface Props {
  onSelectJob: (id: string) => void
}

export function ContractorQuoteList({ onSelectJob }: Props) {
  const [quotes, setQuotes] = useState<QuoteWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/contractor/quotes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuotes(data)
        else setError(data.error ?? 'Failed to load quotes')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  if (quotes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📬</div>
        <p className="text-gray-500">You haven't submitted any quotes yet.</p>
        <p className="text-sm text-gray-400 mt-1">Browse open jobs to get started.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">My Quotes</h2>
      <div className="space-y-3">
        {quotes.map((quote) => (
          <button
            key={quote.id}
            onClick={() => onSelectJob(quote.job.id)}
            className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{quote.job.category.icon}</span>
                  <span className="text-xs text-gray-500">{quote.job.category.name}</span>
                </div>
                <h3 className="font-semibold text-gray-900 truncate">{quote.job.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {quote.job.city}, {quote.job.state}
                </p>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{quote.notes}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-base font-semibold text-gray-900">
                  ${quote.amount.toLocaleString()}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[quote.status]}`}>
                  {quote.status}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
