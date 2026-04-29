import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate } from '../lib/date'

export function ContractorsPage() {
  const [tab, setTab] = useState<'pending' | 'verified'>('pending')
  const [pending, setPending] = useState<any[]>([])
  const [verified, setVerified] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  const loadPending = async () => {
    const res = await apiFetch('/admin/contractors/pending')
    if (res.ok) { const data = await res.json(); setPending(data.contractors) }
  }
  const loadVerified = async () => {
    const res = await apiFetch('/admin/contractors/verified')
    if (res.ok) setVerified(await res.json())
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPending(), loadVerified()]).finally(() => setLoading(false))
  }, [])

  const approve = async (userId: string) => {
    setActioning(userId)
    await apiFetch(`/admin/users/${userId}/verify-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const reject = async (userId: string) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    setActioning(userId)
    await apiFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) })
    setActioning(null)
    await loadPending()
  }

  const toggleFeature = async (userId: string) => {
    await apiFetch(`/admin/users/${userId}/feature-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    await loadVerified()
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contractors</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'pending' ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          Pending Approval
          {pending.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('verified')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'verified' ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          Verified ({verified.length})
        </button>
      </div>

      {tab === 'pending' && (
        pending.length === 0 ? (
          <div className="text-center py-20 bg-green-50 rounded-2xl border border-green-200">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-green-700 font-medium">All contractors are verified!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.user.name}</h3>
                    <p className="text-sm text-gray-500">{c.user.email}</p>
                    <p className="text-sm text-gray-500 mt-1">State: {c.state} · Joined {formatDate(c.user.createdAt)}</p>
                    {c.trades?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.trades.map((t: any) => (
                          <span key={t.id} className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">{t.icon} {t.name}</span>
                        ))}
                      </div>
                    )}
                    {c.profileFiles?.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {c.profileFiles.map((f: any) => (
                          <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline">📄 {f.filename}</a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approve(c.user.id)} disabled={actioning === c.user.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      ✓ Approve
                    </button>
                    <button onClick={() => reject(c.user.id)} disabled={actioning === c.user.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'verified' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jobs</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Featured</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {verified.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.user.name}</p>
                    <p className="text-xs text-gray-500">{c.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.trades?.map((t: any) => t.name).join(', ')}</td>
                  <td className="px-4 py-3 text-gray-500">{c.state}</td>
                  <td className="px-4 py-3 text-gray-500">{c.totalJobs}</td>
                  <td className="px-4 py-3 text-gray-500">★ {c.averageRating.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isFeatured ? 'Featured' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleFeature(c.user.id)}
                      className="text-xs text-blue-600 hover:underline">
                      {c.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {verified.length === 0 && <p className="text-center py-10 text-gray-400">No verified contractors yet</p>}
        </div>
      )}
    </div>
  )
}
