import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { timeAgo } from '../lib/date'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-500',
  IN_REVIEW: 'bg-yellow-500',
  AWARDED: 'bg-blue-500',
  COMPLETED: 'bg-gray-400',
  CANCELLED: 'bg-red-400',
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await apiFetch('/admin/metrics')
      if (res.ok) setMetrics(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>
  if (!metrics) return <div className="p-8 text-red-500">Failed to load metrics</div>

  const totalJobsForChart = metrics.jobsByStatus.reduce((s: number, j: any) => s + j.count, 0) || 1
  const totalCatJobs = metrics.jobsByCategory.reduce((s: number, j: any) => s + j.count, 0) || 1

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={metrics.totals.users} />
        <StatCard label="Total Jobs" value={metrics.totals.jobs} />
        <StatCard label="Completed Jobs" value={metrics.totals.completedJobs} />
        <StatCard label="Open Disputes" value={metrics.totals.disputes} />
      </div>

      {/* This week */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">This Week</h3>
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'New Users', value: metrics.thisWeek.newUsers },
          { label: 'New Jobs', value: metrics.thisWeek.newJobs },
          { label: 'New Quotes', value: metrics.thisWeek.newQuotes },
          { label: 'Completed', value: metrics.thisWeek.completedJobs },
        ].map(item => (
          <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Jobs by Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Jobs by Status</h3>
          <div className="space-y-3">
            {metrics.jobsByStatus.map((item: any) => (
              <div key={item.status}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{item.status}</span>
                  <span>{item.count}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${STATUS_COLORS[item.status] ?? 'bg-gray-400'}`}
                    style={{ width: `${(item.count / totalJobsForChart) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs by Category */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Jobs by Category</h3>
          <div className="space-y-3">
            {metrics.jobsByCategory.map((item: any) => (
              <div key={item.category}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate max-w-[120px]">{item.category}</span>
                  <span>{item.count}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${(item.count / totalCatJobs) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contractors */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Contractors</h3>
          <div className="space-y-3">
            {metrics.topContractors.map((c: any, i: number) => (
              <div key={c.slug ?? i} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.totalJobs} jobs · ★{c.averageRating.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Admin Actions</h3>
        {metrics.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {metrics.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-gray-700">{a.action}{a.notes ? ` — ${a.notes}` : ''}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
