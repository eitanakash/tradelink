import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate } from '../lib/date'

export function ContractorsPage() {
  const [tab, setTab] = useState<'pending' | 'verified'>('pending')
  const [pending, setPending] = useState<any[]>([])
  const [verified, setVerified] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/verify-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const disableAccount = async (userId: string) => {
    if (!confirm('Are you sure you want to disable this contractor account? They will no longer be able to see jobs or appear in Find Contractors.')) return
    setActioning(userId)
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/unverify-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const reject = async (userId: string) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    setActioning(userId)
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const suspendAccount = async (userId: string) => {
    const reason = prompt('Suspension reason:')
    if (!reason) return
    setActioning(userId)
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const unsuspendAccount = async (userId: string) => {
    setActioning(userId)
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/unsuspend`, { method: 'PATCH', body: JSON.stringify({}) })
    setActioning(null)
    await loadPending()
    await loadVerified()
  }

  const toggleFeature = async (userId: string) => {
    setActioning(userId)
    setOpenMenuId(null)
    await apiFetch(`/admin/users/${userId}/feature-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActioning(null)
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
          Pending / Unverified
          {pending.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('verified')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'verified' ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          Approved ({verified.length})
        </button>
      </div>

      {tab === 'pending' && (
        pending.length === 0 ? (
          <div className="text-center py-20 bg-green-50 rounded-2xl border border-green-200">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-green-700 font-medium">All active contractors are verified & approved!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{c.user.name}</h3>
                      {c.user.isSuspended && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Suspended</span>
                      )}
                    </div>
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
                  <div className="flex items-center gap-2 shrink-0 relative">
                    <button onClick={() => approve(c.user.id)} disabled={actioning === c.user.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      ✓ Approve
                    </button>
                    <div className="relative">
                      <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 font-bold transition-colors">
                        ⋮
                      </button>

                      {openMenuId === c.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-11 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                            <button onClick={() => reject(c.user.id)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 font-medium flex items-center gap-2">
                              ✕ Reject / Suspend
                            </button>
                            {c.user.isSuspended ? (
                              <button onClick={() => unsuspendAccount(c.user.id)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-green-600 font-medium flex items-center gap-2">
                                🔓 Unsuspend User
                              </button>
                            ) : (
                              <button onClick={() => suspendAccount(c.user.id)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-amber-600 font-medium flex items-center gap-2">
                                🔒 Suspend User
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'verified' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jobs</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Featured</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Settings</th>
              </tr>
            </thead>
            <tbody>
              {verified.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{c.user.name}</p>
                      {c.user.isSuspended && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Suspended</span>
                      )}
                    </div>
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
                  <td className="px-4 py-3 relative">
                    <div className="relative inline-block text-left">
                      <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                        disabled={actioning === c.user.id}
                        className="px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 font-bold transition-colors disabled:opacity-50">
                        ⋮
                      </button>

                      {openMenuId === c.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-9 z-20 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                            <button onClick={() => disableAccount(c.user.id)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 font-medium flex items-center gap-2">
                              🚫 Disable Account
                            </button>
                            <button onClick={() => toggleFeature(c.user.id)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                              {c.isFeatured ? '⭐ Unfeature Contractor' : '⭐ Feature Contractor'}
                            </button>
                            {c.user.isSuspended ? (
                              <button onClick={() => unsuspendAccount(c.user.id)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-green-600 font-medium flex items-center gap-2">
                                🔓 Unsuspend Account
                              </button>
                            ) : (
                              <button onClick={() => suspendAccount(c.user.id)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-amber-600 font-medium flex items-center gap-2">
                                🔒 Suspend Account
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
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
