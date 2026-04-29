import { useEffect, useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { API_URL } from '../lib/api'
import { useT } from '../lib/i18n'
import { US_STATES } from '../lib/states'
import { wsClient } from '../services/websocket'
import { useToast } from './Toast'
import { Navbar } from './layout/Navbar'
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

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  onModeChange: (mode: ActiveMode) => void
  onUserUpdate: (user: UserProfile) => void
  onLogout: () => void
}

type View = 'list' | 'detail' | 'messages' | 'find-contractors' | 'settings'
type ContractorTab = 'feed' | 'quotes' | 'profile'

export function Dashboard({ user, activeMode, onModeChange, onUserUpdate, onLogout }: Props) {
  const { toast } = useToast()
  const { t } = useT()

  const [view, setView] = useState<View>('list')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showPostJob, setShowPostJob] = useState(false)
  const [contractorTab, setContractorTab] = useState<ContractorTab>('feed')

  const [addingRole, setAddingRole] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [contractorState, setContractorState] = useState('')
  const [showStatePrompt, setShowStatePrompt] = useState(false)

  const [selectedContractorSlug, setSelectedContractorSlug] = useState<string | null>(null)
  const [msgUnread, setMsgUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) wsClient.connect(token)

    const unsubMsg = wsClient.on('NEW_MESSAGE', () => {
      setMsgUnread((n) => n + 1)
    })
    const unsubQuote = wsClient.on('QUOTE_SUBMITTED', () => {
      toast(t('quoteSubmittedToast'), 'info')
    })
    const unsubNotif = wsClient.on('NEW_NOTIFICATION', () => {
      setNotifUnread((n) => n + 1)
    })

    return () => {
      unsubMsg()
      unsubQuote()
      unsubNotif()
      wsClient.disconnect()
    }
  }, [])

  useEffect(() => {
    setView('list')
    setSelectedJobId(null)
    setContractorTab('feed')
    setSelectedContractorSlug(null)
  }, [activeMode])

  const handleOpenMessages = (conversationId?: string) => {
    setSelectedConversationId(conversationId ?? null)
    setView('messages')
    setMsgUnread(0)
  }

  const isClientMode = activeMode === 'CLIENT'
  const missingRole: ActiveMode | null = !user.hasClientProfile
    ? 'CLIENT'
    : !user.hasContractorProfile
      ? 'CONTRACTOR'
      : null

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedJobId(null)
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
        setRoleError(data.error ?? 'Failed to add role')
        return
      }
      onUserUpdate(data)
      onModeChange(role)
      setShowStatePrompt(false)
      setContractorState('')
    } catch {
      setRoleError('Network error. Please try again.')
    } finally {
      setAddingRole(false)
    }
  }

  const activePage = (() => {
    if (view === 'messages') return 'messages'
    if (view === 'find-contractors') return 'find-contractors'
    if (view === 'settings') return 'settings'
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
      <Navbar
        user={user}
        activeMode={activeMode}
        activePage={activePage}
        msgUnread={msgUnread}
        notifUnread={notifUnread}
        onNotifRead={() => setNotifUnread(0)}
        onModeChange={handleModeChange}
        onNavigate={handleNavigate}
        onLogout={onLogout}
      />

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
            <Inbox userId={user.id} initialConversationId={selectedConversationId} />
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
          <>
            {selectedContractorSlug ? (
              <ContractorPublicProfile
                slugOrId={selectedContractorSlug}
                onBack={() => setSelectedContractorSlug(null)}
              />
            ) : (
              <FindContractors
                onSelectContractor={(slugOrId) => setSelectedContractorSlug(slugOrId)}
              />
            )}
          </>
        )}

        {/* Client and Contractor job views */}
        {view !== 'messages' && view !== 'find-contractors' && view !== 'settings' && (
          <>
            {isClientMode ? (
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
                  />
                )}
              </>
            ) : (
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
                        {t('navBrowseJobs')}
                      </button>
                      <button
                        onClick={() => setContractorTab('quotes')}
                        className={`px-4 pb-3 text-sm font-medium transition-colors ${
                          contractorTab === 'quotes'
                            ? 'border-b-2 border-violet-500 text-violet-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t('navMyQuotes')}
                      </button>
                      <button
                        onClick={() => setContractorTab('profile')}
                        className={`px-4 pb-3 text-sm font-medium transition-colors ${
                          contractorTab === 'profile'
                            ? 'border-b-2 border-violet-500 text-violet-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t('navMyProfile')}
                      </button>
                    </div>
                    {contractorTab === 'feed' && (
                      <ContractorJobFeed onSelectJob={handleSelectJob} />
                    )}
                    {contractorTab === 'quotes' && (
                      <ContractorQuoteList onSelectJob={handleSelectJob} />
                    )}
                    {contractorTab === 'profile' && <ContractorProfile />}
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
          </>
        )}
      </main>

      {/* Expand account — only shown when a profile is missing */}
      {missingRole && (
        <div className="max-w-3xl w-full mx-auto px-6 pb-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{t('expandAccount')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {missingRole === 'CONTRACTOR' ? t('becomeContractorPitch') : t('becomeClientPitch')}
            </p>
            {roleError && <p className="text-sm text-red-600 mb-3">{roleError}</p>}

            {missingRole === 'CONTRACTOR' && showStatePrompt ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('stateYouWorkIn')}
                  </label>
                  <select
                    value={contractorState}
                    onChange={(e) => setContractorState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('selectState')}</option>
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
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => handleAddRole('CONTRACTOR', contractorState)}
                    disabled={addingRole || !contractorState}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {addingRole ? t('settingUp') : t('joinAsContractor')}
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
                  ? t('settingUp')
                  : missingRole === 'CONTRACTOR'
                    ? t('alsoJoinAsContractor')
                    : t('alsoJoinAsClient')}
              </button>
            )}
          </div>
        </div>
      )}

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
