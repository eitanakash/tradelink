import { useEffect, useRef, useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../lib/api'
import { US_STATES } from '../lib/states'
import { ClientJobList } from './client/ClientJobList'
import { ClientJobDetail } from './client/ClientJobDetail'
import { PostJobModal } from './client/PostJobModal'
import { ContractorJobFeed } from './contractor/ContractorJobFeed'
import { ContractorJobDetail } from './contractor/ContractorJobDetail'
import { ContractorQuoteList } from './contractor/ContractorQuoteList'
import { ContractorProfile } from './contractor/ContractorProfile'
import { Inbox } from './messages/Inbox'
import { FindContractors } from './directory/FindContractors'
import { ContractorPublicProfile } from './contractor/ContractorPublicProfile'
import { AccountSettings } from './account/AccountSettings'

import { wsClient } from '../services/websocket'
import { NotificationBell } from './NotificationBell'
import { Inbox } from './messages/Inbox'
import { useToast } from './Toast'
import { FindContractors } from './directory/FindContractors'
import { ContractorPublicProfilePage } from './contractor/ContractorPublicProfile'

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  onModeChange: (mode: ActiveMode) => void
  onUserUpdate: (user: UserProfile) => void
  onLogout: () => void
}

type View = 'list' | 'detail' | 'messages' | 'find-contractors' | 'settings'
type ContractorTab = 'feed' | 'quotes' | 'profile'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export function Dashboard({ user, activeMode, onModeChange, onUserUpdate, onLogout }: Props) {
  const { t, i18n } = useTranslation()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  const changeLang = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    setShowLangMenu(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [view, setView] = useState<View>('list')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showPostJob, setShowPostJob] = useState(false)
  const [contractorTab, setContractorTab] = useState<ContractorTab>('feed')

  const [addingRole, setAddingRole] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [contractorState, setContractorState] = useState('')
  const [showStatePrompt, setShowStatePrompt] = useState(false)

  const { toast } = useToast()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState(false)
  const [msgUnread, setMsgUnread] = useState(0)
  const [showDirectory, setShowDirectory] = useState(false)
  const [selectedContractorSlug, setSelectedContractorSlug] = useState<string | null>(null)

  useEffect(() => {
    setView('list')
    setSelectedJobId(null)
    setContractorTab('feed')
    setShowDirectory(false)
    setSelectedContractorSlug(null)
    history.replaceState({ view: 'list', mode: activeMode }, '')
  }, [activeMode])

  // Set initial history state on mount
  useEffect(() => {
    history.replaceState({ view: 'list', mode: activeMode }, '')
  }, [])

  // Restore state on browser back/forward
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state
      if (!s) return
      if (s.view === 'messages') {
        setShowMessages(true)
        setShowDirectory(false)
        setSelectedConversationId(s.conversationId ?? null)
        setView('list')
        setSelectedJobId(null)
      } else if (s.view === 'directory') {
        setShowDirectory(true)
        setShowMessages(false)
        setSelectedContractorSlug(s.contractorSlug ?? null)
        setView('list')
        setSelectedJobId(null)
      } else if (s.view === 'detail') {
        setShowDirectory(false)
        setShowMessages(false)
        setView('detail')
        setSelectedJobId(s.jobId ?? null)
      } else {
        setShowDirectory(false)
        setShowMessages(false)
        setView('list')
        setSelectedJobId(null)
        if (s.contractorTab) setContractorTab(s.contractorTab)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) wsClient.connect(token)

    const offNewMsg = wsClient.on('NEW_MESSAGE', () => {
      setMsgUnread((n) => n + 1)
    })
    const offQuote = wsClient.on('QUOTE_SUBMITTED', () => {
      toast(t('dashboard.newQuoteArrived'), 'info')
    })

    return () => {
      offNewMsg()
      offQuote()
      wsClient.disconnect()
    }
  }, [])

  const handleOpenMessages = (conversationId?: string) => {
    setSelectedConversationId(conversationId ?? null)
    setShowMessages(true)
    setShowDirectory(false)
    setMsgUnread(0)
    history.pushState({ view: 'messages', conversationId: conversationId ?? null, mode: activeMode }, '')
  }

  const handleSelectContractor = (slug: string) => {
    setSelectedContractorSlug(slug)
    setShowDirectory(true)
    setShowMessages(false)
    history.pushState({ view: 'directory', contractorSlug: slug, mode: activeMode }, '')
  }

  const hasBoth = user.hasClientProfile && user.hasContractorProfile
  const isClientMode = activeMode === 'CLIENT'
  const missingRole: ActiveMode | null = !user.hasClientProfile
    ? 'CLIENT'
    : !user.hasContractorProfile
    ? 'CONTRACTOR'
    : null

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id)
    setView('detail')
    setShowDirectory(false)
    setShowMessages(false)
    history.pushState({ view: 'detail', jobId: id, mode: activeMode }, '')
  }

  const handleBack = () => {
    setView('list')
    setSelectedJobId(null)
    history.back()
  }

  const handleAddRole = async (role: ActiveMode, state?: string) => {
    setAddingRole(true)
    setRoleError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/auth/add-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, ...(state ? { state } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRoleError(data.error ?? t('dashboard.failedAddRole'))
        return
      }
      onUserUpdate(data)
      onModeChange(role)
      setShowStatePrompt(false)
      setContractorState('')
    } catch {
      setRoleError(t('common.networkError'))
    } finally {
      setAddingRole(false)
    }
  }

  // Compute active page for nav highlighting
  const activePage = (() => {
    if (view === 'messages') return 'messages'
    if (view === 'find-contractors') return 'find-contractors'
    if (isClientMode) return 'my-jobs'
    if (contractorTab === 'feed') return 'browse-jobs'
    if (contractorTab === 'quotes') return 'my-quotes'
    if (contractorTab === 'profile') return 'my-profile'
    return ''
  })()

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'my-jobs':
        setView('list')
        setSelectedJobId(null)
        break
      case 'post-job':
        setShowPostJob(true)
        break
      case 'find-contractors':
        setView('find-contractors')
        setSelectedContractorSlug(null)
        break
      case 'messages':
        setView('messages')
        setMsgUnread(0)
        break
      case 'browse-jobs':
        setContractorTab('feed')
        setView('list')
        setSelectedJobId(null)
        break
      case 'my-quotes':
        setContractorTab('quotes')
        setView('list')
        setSelectedJobId(null)
        break
      case 'my-profile':
        setContractorTab('profile')
        setView('list')
        setSelectedJobId(null)
        break
      case 'settings/account':
        setView('settings')
        break
      case 'become-contractor':
        if (missingRole === 'CONTRACTOR') setShowStatePrompt(true)
        break
      case 'become-client':
        handleAddRole('CLIENT')
        break
    }
  }

  const handleModeChange = (mode: ActiveMode) => {
    onModeChange(mode)
    toast(
      mode === 'CONTRACTOR' ? t('switchedToContractor') : t('switchedToClient'),
      'info',
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              setView('list')
              setSelectedJobId(null)
              setShowDirectory(false)
              setShowMessages(false)
              setSelectedContractorSlug(null)
              history.pushState({ view: 'list', mode: activeMode }, '')
            }}
            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            Tradelink
          </button>
          <div className="flex items-center gap-3">
            {hasBoth && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onModeChange('CLIENT')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeMode === 'CLIENT'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('nav.clientMode')}
                </button>
                <button
                  onClick={() => onModeChange('CONTRACTOR')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeMode === 'CONTRACTOR'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('nav.contractorMode')}
                </button>
              </div>
            )}
            {/* Find Contractors (client mode only) */}
            {isClientMode && (
              <button
                onClick={() => {
                  setShowDirectory(true)
                  setSelectedContractorSlug(null)
                  setShowMessages(false)
                  history.pushState({ view: 'directory', contractorSlug: null, mode: activeMode }, '')
                }}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${showDirectory ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                {t('nav.findContractors')}
              </button>
            )}
            {/* Messages button */}
            <button
              onClick={() => handleOpenMessages()}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl">💬</span>
              {msgUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {msgUnread > 99 ? '99+' : msgUnread}
                </span>
              )}
            </button>
            <NotificationBell />
            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
            <div ref={langMenuRef} className="relative">
              <button
                onClick={() => setShowLangMenu(v => !v)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Language"
                aria-label="Choose language"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                </svg>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {LANGUAGES.map(({ code, label, flag }) => (
                    <button
                      key={code}
                      onClick={() => changeLang(code)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        i18n.language === code
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{flag}</span>
                      {label}
                      {i18n.language === code && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { wsClient.disconnect(); onLogout() }}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        {/* Messages view */}
        {view === 'messages' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView('list')}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {t('backBtn')}
              </button>
              <h1 className="text-xl font-bold text-gray-900">{t('messagesTitle')}</h1>
            </div>
            <Inbox
              userId={user.id}
              initialConversationId={selectedConversationId}
            />
          </div>
        )}

        {/* Account Settings view */}
        {view === 'settings' && (
          <div>
            <button
              onClick={() => setView('list')}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-6"
            >
              {t('backBtn')}
            </button>
            <AccountSettings
              onUserUpdate={(patch) => onUserUpdate({ ...user, ...patch })}
              onLogout={onLogout}
            />
          </div>
        )}

        {/* Find Contractors view */}
        {view === 'find-contractors' && (
        {showMessages ? (
          <div>
            <button
              onClick={() => { setShowMessages(false); history.back() }}
              className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1"
            >
              {t('dashboard.back')}
            </button>
            <Inbox userId={user.id} initialConversationId={selectedConversationId} />
          </div>
        ) : showDirectory && isClientMode ? (
          selectedContractorSlug ? (
            <ContractorPublicProfilePage
              slug={selectedContractorSlug}
              onBack={() => { setSelectedContractorSlug(null); history.back() }}
            />
          ) : (
            <FindContractors onSelectContractor={handleSelectContractor} />
          )
        ) : isClientMode ? (
          <>
            {view === 'list' && (
              <ClientJobList
                onSelectJob={handleSelectJob}
                onPostJob={() => setShowPostJob(true)}
              />
            )}
            {view === 'detail' && selectedJobId && (
              <ClientJobDetail
                jobId={selectedJobId}
                onBack={handleBack}
                onDeleted={handleBack}
                onOpenConversation={handleOpenMessages}
                onSelectContractor={handleSelectContractor}
              />
            )}
          </>
        )}

        {/* Job views */}
        {view !== 'messages' && view !== 'find-contractors' && view !== 'settings' && (
          <>
            {view === 'list' && (
              <>
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setContractorTab('feed')}
                    className={`px-4 pb-3 text-sm font-medium transition-colors ${
                      contractorTab === 'feed'
                        ? 'border-b-2 border-violet-500 text-violet-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('dashboard.browseJobs')}
                  </button>
                  <button
                    onClick={() => setContractorTab('quotes')}
                    className={`px-4 pb-3 text-sm font-medium transition-colors ${
                      contractorTab === 'quotes'
                        ? 'border-b-2 border-violet-500 text-violet-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('dashboard.myQuotes')}
                  </button>
                  <button
                    onClick={() => setContractorTab('profile')}
                    className={`px-4 pb-3 text-sm font-medium transition-colors ${
                      contractorTab === 'profile'
                        ? 'border-b-2 border-violet-500 text-violet-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('dashboard.profile')}
                  </button>
                </div>
                {contractorTab === 'feed' && (
                  <ContractorJobFeed onSelectJob={handleSelectJob} />
                )}
                {contractorTab === 'quotes' && (
                  <ContractorQuoteList onSelectJob={handleSelectJob} />
                )}
                {contractorTab === 'profile' && (
                  <ContractorProfile />
                )}
              </>
            )}
            {view === 'detail' && selectedJobId && (
              <ContractorJobDetail
                jobId={selectedJobId}
                onBack={handleBack}
                onOpenConversation={handleOpenMessages}
              />
            )}
          </>
        )}
      </main>

      {/* Expand account — only shown when a profile is missing */}
      {missingRole && (
        <div className="max-w-3xl w-full mx-auto px-6 pb-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{t('dashboard.expandAccount')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {missingRole === 'CONTRACTOR'
                ? t('dashboard.expandContractorText')
                : t('dashboard.expandClientText')}
            </p>
            {roleError && <p className="text-sm text-red-600 mb-3">{roleError}</p>}

            {missingRole === 'CONTRACTOR' && showStatePrompt ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.stateWorkIn')}
                  </label>
                  <select
                    value={contractorState}
                    onChange={(e) => setContractorState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('dashboard.selectState')}</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStatePrompt(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddRole('CONTRACTOR', contractorState)}
                    disabled={addingRole || !contractorState}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {addingRole ? t('dashboard.settingUp') : t('dashboard.joinAsContractor')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (missingRole === 'CONTRACTOR') {
                    setShowStatePrompt(true)
                  } else {
                    handleAddRole('CLIENT')
                  }
                }}
                disabled={addingRole}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {addingRole
                  ? t('dashboard.settingUp')
                  : missingRole === 'CONTRACTOR'
                  ? t('dashboard.joinAsContractor')
                  : t('dashboard.joinAsClient')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Post Job modal */}
      {showPostJob && (
        <PostJobModal
          onClose={() => setShowPostJob(false)}
          onCreated={(jobId) => {
            setShowPostJob(false)
            handleSelectJob(jobId)
          }}
        />
      )}
    </div>
  )
}
