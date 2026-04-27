import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate } from '../lib/date'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  AWARDED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

export function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [jobDetail, setJobDetail] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('q', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiFetch(`/admin/jobs?${params}`)
      if (res.ok) { const data = await res.json(); setJobs(data.jobs); setTotal(data.total) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, statusFilter, page])

  const loadDetail = async (jobId: string) => {
    const res = await apiFetch(`/admin/jobs/${jobId}`)
    if (res.ok) setJobDetail(await res.json())
  }

  const handleCancelJob = async (jobId: string) => {
    const reason = prompt('Reason for cancellation:')
    if (!reason) return
    setCancelling(true)
    await apiFetch(`/admin/jobs/${jobId}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) })
    setCancelling(false)
    load()
    setSelectedJob(null)
    setJobDetail(null)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Jobs</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search jobs…"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['OPEN', 'IN_REVIEW', 'AWARDED', 'COMPLETED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quotes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Posted</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j.id}
                  onClick={() => { setSelectedJob(j); setJobDetail(null); loadDetail(j.id) }}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${i % 2 === 0 ? 'hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{j.title}</td>
                  <td className="px-4 py-3 text-gray-500">{j.client?.user?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{j.category?.icon} {j.category?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{j.city}, {j.state}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[j.status] ?? ''}`}>{j.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{j._count?.quotes ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && <p className="text-center py-10 text-gray-400">No jobs found</p>}
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Previous</button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={jobs.length < 20}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
      </div>

      {/* Detail modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => { setSelectedJob(null); setJobDetail(null) }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{selectedJob.title}</h3>
              <button onClick={() => { setSelectedJob(null); setJobDetail(null) }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              {jobDetail ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">{jobDetail.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{jobDetail.address}, {jobDetail.city}, {jobDetail.state}</p>
                    <p className="text-sm text-gray-500">Client: {jobDetail.client?.user?.name} ({jobDetail.client?.user?.email})</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quotes ({jobDetail.quotes?.length ?? 0})</p>
                    {jobDetail.quotes?.map((q: any) => (
                      <div key={q.id} className="text-sm text-gray-700 py-1 border-b border-gray-100">
                        {q.contractor?.user?.name} — <span className={`font-medium ${q.status === 'ACCEPTED' ? 'text-green-600' : q.status === 'REJECTED' ? 'text-red-500' : 'text-gray-600'}`}>{q.status}</span>
                        {q.tiers?.length > 0 && ` · $${Math.min(...q.tiers.map((t: any) => t.price)).toLocaleString()}`}
                      </div>
                    ))}
                  </div>
                  {jobDetail.status !== 'CANCELLED' && jobDetail.status !== 'COMPLETED' && (
                    <button onClick={() => handleCancelJob(jobDetail.id)} disabled={cancelling}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg">
                      {cancelling ? '…' : 'Cancel Job'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Loading details…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
