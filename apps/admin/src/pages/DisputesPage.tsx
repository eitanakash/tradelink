import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate } from '../lib/date'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

export function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [newStatus, setNewStatus] = useState('')
  const [resolution, setResolution] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    const res = await apiFetch(`/admin/disputes?${params}`)
    if (res.ok) { const data = await res.json(); setDisputes(data.disputes); setTotal(data.total) }
    setLoading(false)
  }

  const loadDetail = async (id: string) => {
    const res = await apiFetch(`/admin/disputes/${id}`)
    if (res.ok) setDetail(await res.json())
  }

  useEffect(() => { load() }, [statusFilter])

  const handleUpdate = async () => {
    if (!selected || !newStatus) return
    setUpdating(true)
    await apiFetch(`/admin/disputes/${selected.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, resolution: resolution || undefined }),
    })
    setUpdating(false)
    setSelected(null)
    setDetail(null)
    load()
  }

  const openCount = disputes.filter((d: any) => d.status === 'OPEN').length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Disputes</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="flex gap-1 mb-6">
        {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', ''].map(s => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors relative ${
              statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {s || 'All'}
            {s === 'OPEN' && openCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <div className="space-y-3">
          {disputes.map(d => (
            <div key={d.id}
              onClick={() => { setSelected(d); setDetail(null); setNewStatus(d.status); setResolution(d.resolution ?? ''); loadDetail(d.id) }}
              className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{d.job?.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Filed by: {d.reportedById} · {formatDate(d.createdAt)}</p>
                  <p className="text-sm text-gray-600 mt-1">Reason: {d.reason}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
              </div>
            </div>
          ))}
          {disputes.length === 0 && (
            <div className="text-center py-20 text-gray-400">No disputes found</div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => { setSelected(null); setDetail(null) }}>
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Dispute Detail</h3>
              <button onClick={() => { setSelected(null); setDetail(null) }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium text-gray-900">Job: {selected.job?.title}</p>
                <p className="text-sm text-gray-600 mt-1">Reason: {selected.reason}</p>
                <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
              </div>
              {detail && (
                <div>
                  <p className="text-sm text-gray-500">Client: {detail.job?.client?.user?.name}</p>
                  <p className="text-sm text-gray-500">Contractor: {detail.job?.quotes?.[0]?.contractor?.user?.name ?? 'N/A'}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2">
                  {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                  placeholder="Resolution notes…" rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                <button onClick={handleUpdate} disabled={updating}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg">
                  {updating ? '…' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
