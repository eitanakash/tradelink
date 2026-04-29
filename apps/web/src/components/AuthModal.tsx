import { useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../lib/api'
import { US_STATES } from '../lib/states'
import { useT } from '../lib/i18n'

interface Props {
  initialRole: ActiveMode
  onClose: () => void
  onSuccess: (token: string, user: UserProfile) => void
}

type Tab = 'register' | 'login'

export function AuthModal({ initialRole, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
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
        setError(data.error ?? t('auth.registrationFailed'))
        return
      }
      onSuccess(data.token, await fetchMe(data.token))
    } catch {
      setError(t('common.networkError'))
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
        setError(data.error ?? t('auth.loginFailed'))
        return
      }
      onSuccess(data.token, await fetchMe(data.token))
    } catch {
      setError(t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (tab: Tab) => {
    setTab(tab)
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
                {tab === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
              </h2>
              {tab === 'register' && (
                <span
                  className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    initialRole === 'CLIENT'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-violet-100 text-violet-700'
                  }`}
                >
                  {t('auth.startingAs', { role: initialRole === 'CLIENT' ? t('auth.client') : t('auth.contractor') })}
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
            {(['register', 'login'] as Tab[]).map((tabOption) => (
              <button
                key={tabOption}
                onClick={() => switchTab(tabOption)}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                  tab === tabOption
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tabOption === 'register' ? t('auth.signUp') : t('auth.signIn')}
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
                <label className={labelCls}>{t('auth.fullName')}</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('auth.password')}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className={inputCls}
                />
              </div>
              {initialRole === 'CONTRACTOR' && (
                <div>
                  <label className={labelCls}>{t('auth.stateWorkIn')}</label>
                  <select
                    required
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('auth.selectState')}</option>
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
                {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
              </button>
              <p className="text-xs text-center text-gray-400">
                {t('auth.addRoleAfterSignup')}
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelCls}>{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('auth.password')}</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t('auth.yourPassword')}
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
