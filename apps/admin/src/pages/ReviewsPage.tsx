import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate } from '../lib/date'

export function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filter) params.set('filter', filter)
    const res = await apiFetch(`/admin/reviews?${params}`)
    if (res.ok) { const data = await res.json(); setReviews(data.reviews); setTotal(data.total) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, page])

  const handleDelete = async (reviewId: string) => {
    const reason = prompt('Reason for deletion:')
    if (!reason) return
    setDeleting(reviewId)
    await apiFetch(`/admin/reviews/${reviewId}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
    setDeleting(null)
    load()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="flex gap-1 mb-4">
        {[{ label: 'All', value: '' }, { label: 'Low (1-2 ★)', value: 'low' }].map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f.value ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contractor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Author</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r, i) => (
                <>
                  <tr key={r.id}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.contractor?.user?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.author?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${r.rating <= 2 ? 'text-red-600' : r.rating <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          className="text-xs text-blue-600 hover:underline">
                          {expanded === r.id ? 'Collapse' : 'Expand'}
                        </button>
                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                          className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-exp`} className="bg-blue-50">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-sm text-gray-700">{r.body}</p>
                        {r.contractorReply && (
                          <p className="text-sm text-gray-500 mt-2 pl-3 border-l-2 border-gray-300">
                            Reply: {r.contractorReply}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {reviews.length === 0 && <p className="text-center py-10 text-gray-400">No reviews found</p>}
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Previous</button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={reviews.length < 20}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
      </div>
    </div>
  )
}
