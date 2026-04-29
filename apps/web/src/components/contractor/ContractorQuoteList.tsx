import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'

interface QuoteTierSummary {
  id: string
  price: number
  name: string
}

interface QuoteWithJob {
  id: string
  coverLetter: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  tiers: QuoteTierSummary[]
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
  const { t } = useTranslation()
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
        else setError(data.error ?? t('quoteList.failedLoad'))
      })
      .catch(() => setError(t('common.networkError')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  if (quotes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📬</div>
        <p className="text-gray-500">{t('quoteList.noQuotes')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('quoteList.browseJobs')}</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('quoteList.myQuotes')}</h2>
      <div className="space-y-3">
        {quotes.map((quote) => {
          const prices = quote.tiers.map((t) => t.price)
          const minPrice = prices.length > 0 ? Math.min(...prices) : null
          const maxPrice = prices.length > 0 ? Math.max(...prices) : null
          const priceLabel =
            minPrice === null
              ? '—'
              : minPrice === maxPrice
              ? `$${minPrice.toLocaleString()}`
              : `$${minPrice.toLocaleString()} – $${maxPrice!.toLocaleString()}`

          return (
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
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{quote.coverLetter}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-base font-semibold text-gray-900">{priceLabel}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[quote.status]}`}>
                    {t(`status.${quote.status}`, { defaultValue: quote.status })}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
