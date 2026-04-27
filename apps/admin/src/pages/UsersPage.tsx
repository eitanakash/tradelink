import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate, timeAgo } from '../lib/date'

const ROLE_BADGE = (u: any) => {
  const roles = []
  if (u.clientProfile) roles.push('Client')
  if (u.contractorProfile) roles.push('Contractor')
  if (u.isAdmin) roles.push('Admin')
  return roles.join(', ') || 'None'
}

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'client' | 'contractor' | 'suspended'>('all')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('q', search)
      if (filter === 'suspended') params.set('suspended', 'true')
      if (filter === 'client') params.set('role', 'client')
      if (filter === 'contractor') params.set('role', 'contractor')
      const res = await apiFetch(`/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, filter, page])

  const loadDetail = async (userId: string) => {
    const res = await apiFetch(`/admin/users/${userId}`)
    if (res.ok) setUserDetail(await res.json())
  }

  const handleSelectUser = (u: any) => {
    setSelectedUser(u)
    setUserDetail(null)
    loadDetail(u.id)
  }

  const handleSuspend = async (userId: string, reason: string) => {
    setActionLoading(true)
    await apiFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) })
    setActionLoading(false)
    load()
    if (userDetail?.id === userId) loadDetail(userId)
  }

  const handleUnsuspend = async (userId: string) => {
    setActionLoading(true)
    await apiFetch(`/admin/users/${userId}/unsuspend`, { method: 'PATCH', body: JSON.stringify({}) })
    setActionLoading(false)
    load()
    if (userDetail?.id === userId) loadDetail(userId)
  }

  const handleVerify = async (userId: string) => {
    setActionLoading(true)
    await apiFetch(`/admin/users/${userId}/verify-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActionLoading(false)
    load()
    if (userDetail?.id === userId) loadDetail(userId)
  }

  const handleFeature = async (userId: string) => {
    setActionLoading(true)
    await apiFetch(`/admin/users/${userId}/feature-contractor`, { method: 'PATCH', body: JSON.stringify({}) })
    setActionLoading(false)
    load()
    if (userDetail?.id === userId) loadDetail(userId)
  }

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={`flex-1 p-8 overflow-auto ${selectedUser ? 'max-w-3xl' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <span className="text-sm text-gray-500">{total} total</span>
        </div>

        {/* Search */}
        <input
          type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or email…"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {(['all', 'client', 'contractor', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors ${
                filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? <p className="text-gray-400">Loading…</p> : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Roles</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedUser?.id === u.id ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'
                    }`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{ROLE_BADGE(u)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center py-10 text-gray-400">No users found</p>}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            ← Previous
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedUser && (
        <div className="w-96 border-l border-gray-200 bg-white overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{selectedUser.name}</h3>
            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <p className="text-sm text-gray-500 mb-1">{selectedUser.email}</p>
          <p className="text-sm text-gray-500 mb-4">Joined {formatDate(selectedUser.createdAt)}</p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedUser.isSuspended ? (
              <button onClick={() => handleUnsuspend(selectedUser.id)} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg">
                Unsuspend
              </button>
            ) : (
              <button onClick={() => {
                const reason = prompt('Suspension reason:')
                if (reason) handleSuspend(selectedUser.id, reason)
              }} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg">
                Suspend
              </button>
            )}
            {selectedUser.contractorProfile && !selectedUser.contractorProfile.isVerified && (
              <button onClick={() => handleVerify(selectedUser.id)} disabled={actionLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                Verify Contractor
              </button>
            )}
            {selectedUser.contractorProfile && (
              <button onClick={() => handleFeature(selectedUser.id)} disabled={actionLoading}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg">
                {selectedUser.contractorProfile.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
            )}
          </div>

          {/* Detail info */}
          {userDetail ? (
            <div className="space-y-4">
              {userDetail.contractorProfile && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contractor</p>
                  <p className="text-sm">State: {userDetail.contractorProfile.state}</p>
                  <p className="text-sm">Verified: {userDetail.contractorProfile.isVerified ? '✓ Yes' : '✗ No'}</p>
                  <p className="text-sm">Rating: {userDetail.contractorProfile.averageRating.toFixed(1)} ({userDetail.contractorProfile.totalReviews} reviews)</p>
                  <p className="text-sm">Jobs: {userDetail.contractorProfile.totalJobs}</p>
                </div>
              )}
              {userDetail.adminLogs?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Admin Log</p>
                  <div className="space-y-1">
                    {userDetail.adminLogs.map((log: any) => (
                      <div key={log.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{log.action}</span>
                        <span className="text-gray-400">{timeAgo(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading details…</p>
          )}
        </div>
      )}
    </div>
  )
}
