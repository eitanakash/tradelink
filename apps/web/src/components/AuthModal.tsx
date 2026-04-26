import { useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { API_URL } from '../lib/api'
import { US_STATES } from '../lib/states'

interface Props {
  initialRole: ActiveMode
  onClose: () => void
  onSuccess: (token: string, user: UserProfile) => void
}

type Tab = 'register' | 'login'

export function AuthModal({ initialRole, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('register')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regState, setRegState] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const fetchMe = async (token: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          name: regName,
          initialRole,
          ...(initialRole === 'CONTRACTOR' ? { state: regState } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registration failed')
        return
      }
      onSuccess(data.token, await fetchMe(data.token))
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        return
      }
      onSuccess(data.token, await fetchMe(data.token))
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
  }

  const inputCls =
    'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {tab === 'register' ? 'Create account' : 'Welcome back'}
              </h2>
              {tab === 'register' && (
                <span
                  className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    initialRole === 'CLIENT'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-violet-100 text-violet-700'
                  }`}
                >
                  Starting as {initialRole === 'CLIENT' ? 'Client' : 'Contractor'}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-1"
            >
              ✕
            </button>
          </div>

          <div className="flex mt-6 border-b border-gray-200">
            {(['register', 'login'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'register' ? 'Sign up' : 'Sign in'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {tab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Jane Smith"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputCls}
                />
              </div>
              {initialRole === 'CONTRACTOR' && (
                <div>
                  <label className={labelCls}>State you work in</label>
                  <select
                    required
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select a state…</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
              <p className="text-xs text-center text-gray-400">
                You can add the other role from your dashboard after signing up
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
