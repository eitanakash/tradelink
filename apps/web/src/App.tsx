import { useState, useEffect } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { LandingPage } from './components/LandingPage'
import { Dashboard } from './components/Dashboard'
import { API_URL } from './lib/api'

function resolveMode(user: UserProfile, stored: string | null): ActiveMode {
  if (user.hasClientProfile && !user.hasContractorProfile) return 'CLIENT'
  if (user.hasContractorProfile && !user.hasClientProfile) return 'CONTRACTOR'
  return stored === 'CONTRACTOR' ? 'CONTRACTOR' : 'CLIENT'
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [activeMode, setActiveModeState] = useState<ActiveMode>('CLIENT')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then<UserProfile>((res) => (res.ok ? res.json() : Promise.reject()))
      .then((profile) => {
        setUser(profile)
        setActiveModeState(resolveMode(profile, localStorage.getItem('activeMode')))
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const setActiveMode = (mode: ActiveMode) => {
    localStorage.setItem('activeMode', mode)
    setActiveModeState(mode)
  }

  const handleAuth = (token: string, profile: UserProfile) => {
    localStorage.setItem('token', token)
    setUser(profile)
    setActiveModeState(resolveMode(profile, null))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('activeMode')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onUserUpdate={setUser}
        onLogout={handleLogout}
      />
    )
  }

  return <LandingPage onAuth={handleAuth} />
}
