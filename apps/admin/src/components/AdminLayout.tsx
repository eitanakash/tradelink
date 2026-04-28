import { useState } from 'react'
import { DashboardPage } from '../pages/DashboardPage'
import { UsersPage } from '../pages/UsersPage'
import { ContractorsPage } from '../pages/ContractorsPage'
import { JobsPage } from '../pages/JobsPage'
import { DisputesPage } from '../pages/DisputesPage'
import { ReviewsPage } from '../pages/ReviewsPage'
import { SettingsPage } from '../pages/SettingsPage'

type Page = 'dashboard' | 'users' | 'contractors' | 'jobs' | 'disputes' | 'reviews' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'contractors', label: 'Contractors', icon: '🔧' },
  { id: 'jobs', label: 'Jobs', icon: '📋' },
  { id: 'disputes', label: 'Disputes', icon: '⚠️' },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-white font-bold text-lg">Tradelink</h1>
          <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                page === item.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'users' && <UsersPage />}
        {page === 'contractors' && <ContractorsPage />}
        {page === 'jobs' && <JobsPage />}
        {page === 'disputes' && <DisputesPage />}
        {page === 'reviews' && <ReviewsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
