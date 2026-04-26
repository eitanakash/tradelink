import { useEffect, useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { API_URL } from '../lib/api'
import { US_STATES } from '../lib/states'
import { ClientJobList } from './client/ClientJobList'
import { ClientJobDetail } from './client/ClientJobDetail'
import { PostJobModal } from './client/PostJobModal'
import { ContractorJobFeed } from './contractor/ContractorJobFeed'
import { ContractorJobDetail } from './contractor/ContractorJobDetail'
import { ContractorQuoteList } from './contractor/ContractorQuoteList'

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  onModeChange: (mode: ActiveMode) => void
  onUserUpdate: (user: UserProfile) => void
  onLogout: () => void
}

type View = 'list' | 'detail'
type ContractorTab = 'feed' | 'quotes'

export function Dashboard({ user, activeMode, onModeChange, onUserUpdate, onLogout }: Props) {
  const [view, setView] = useState<View>('list')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showPostJob, setShowPostJob] = useState(false)
  const [contractorTab, setContractorTab] = useState<ContractorTab>('feed')

  const [addingRole, setAddingRole] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [contractorState, setContractorState] = useState('')
  const [showStatePrompt, setShowStatePrompt] = useState(false)

  useEffect(() => {
    setView('list')
    setSelectedJobId(null)
    setContractorTab('feed')
  }, [activeMode])

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">Tradelink</span>
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
                  Client mode
                </button>
                <button
                  onClick={() => onModeChange('CONTRACTOR')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeMode === 'CONTRACTOR'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Contractor mode
                </button>
              </div>
            )}
            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        {isClientMode ? (
          <>
            {view === 'list' && (
              <ClientJobList
                onSelectJob={handleSelectJob}
                onPostJob={() => setShowPostJob(true)}
              />
            )}
            {view === 'detail' && selectedJobId && (
              <ClientJobDetail jobId={selectedJobId} onBack={handleBack} onDeleted={handleBack} />
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
                    Browse Jobs
                  </button>
                  <button
                    onClick={() => setContractorTab('quotes')}
                    className={`px-4 pb-3 text-sm font-medium transition-colors ${
                      contractorTab === 'quotes'
                        ? 'border-b-2 border-violet-500 text-violet-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    My Quotes
                  </button>
                </div>
                {contractorTab === 'feed' && (
                  <ContractorJobFeed onSelectJob={handleSelectJob} />
                )}
                {contractorTab === 'quotes' && (
                  <ContractorQuoteList onSelectJob={handleSelectJob} />
                )}
              </>
            )}
            {view === 'detail' && selectedJobId && (
              <ContractorJobDetail jobId={selectedJobId} onBack={handleBack} />
            )}
          </>
        )}
      </main>

      {/* Expand account — only shown when a profile is missing */}
      {missingRole && (
        <div className="max-w-3xl w-full mx-auto px-6 pb-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Expand your account</h2>
            <p className="text-sm text-gray-500 mb-4">
              {missingRole === 'CONTRACTOR'
                ? 'Got skills to offer? Join as a contractor and find work on your own schedule.'
                : 'Need work done? Join as a client and post jobs for contractors to apply.'}
            </p>
            {roleError && <p className="text-sm text-red-600 mb-3">{roleError}</p>}

            {missingRole === 'CONTRACTOR' && showStatePrompt ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State you work in
                  </label>
                  <select
                    value={contractorState}
                    onChange={(e) => setContractorState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a state…</option>
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
                    {addingRole ? 'Setting up…' : 'Join as Contractor'}
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
                  ? 'Setting up…'
                  : missingRole === 'CONTRACTOR'
                  ? 'Also join as a Contractor'
                  : 'Also join as a Client'}
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
