import { useEffect } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { useT } from '../../lib/i18n'

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  activePage: string
  msgUnread: number
  notifUnread: number
  onModeChange: (mode: ActiveMode) => void
  onNavigate: (page: string) => void
  onLogout: () => void
  onClose: () => void
}

export function MobileMenu({
  user,
  activeMode,
  activePage,
  msgUnread,
  onModeChange,
  onNavigate,
  onLogout,
  onClose,
}: Props) {
  const { lang, setLang, t } = useT()
  const isClient = activeMode === 'CLIENT'
  const hasBoth = user.hasClientProfile && user.hasContractorProfile

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const nav = (page: string) => {
    onNavigate(page)
    onClose()
  }

  const linkCls = (page: string) =>
    `w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-l-[3px] ${
      activePage === page
        ? 'bg-blue-50 text-blue-700 border-blue-600'
        : 'text-gray-700 border-transparent hover:bg-gray-50'
    }`

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-auto min-w-[20px] h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
        {count > 9 ? '9+' : count}
      </span>
    ) : null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-80 max-w-full h-full bg-white flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-lg font-bold text-blue-600">Tradelink</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{user.name ?? user.email}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>

        {/* Mode toggle */}
        {hasBoth && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => { onModeChange('CLIENT'); onClose() }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  isClient ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('modeClient')}
              </button>
              <button
                onClick={() => { onModeChange('CONTRACTOR'); onClose() }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  !isClient ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('modeContractor')}
              </button>
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="border-b border-gray-100 py-1">
          {isClient ? (
            <>
              <button onClick={() => nav('post-job')} className={linkCls('post-job')}>
                {t('postJobMenu')}
              </button>
              <button onClick={() => nav('my-jobs')} className={linkCls('my-jobs')}>
                {t('myJobsMenu')}
              </button>
              <button onClick={() => nav('find-contractors')} className={linkCls('find-contractors')}>
                {t('findContractorsMenu')}
              </button>
              <button onClick={() => nav('messages')} className={linkCls('messages')}>
                {t('messagesMenu')}
                <Badge count={msgUnread} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => nav('browse-jobs')} className={linkCls('browse-jobs')}>
                {t('browseJobsMobile')}
              </button>
              <button onClick={() => nav('my-quotes')} className={linkCls('my-quotes')}>
                {t('myQuotesMenu')}
              </button>
              <button onClick={() => nav('messages')} className={linkCls('messages')}>
                {t('messagesMenu')}
                <Badge count={msgUnread} />
              </button>
              <button onClick={() => nav('my-profile')} className={linkCls('my-profile')}>
                {t('myProfileWorker')}
              </button>
            </>
          )}
        </div>

        {/* Profile section */}
        <div className="border-b border-gray-100 py-1">
          <button onClick={() => nav('my-profile')} className={linkCls('my-profile')}>
            {t('myProfileMenu')}
          </button>
          {isClient && !user.hasContractorProfile && (
            <button onClick={() => nav('become-contractor')} className={linkCls('become-contractor')}>
              {t('becomeContractor')}
            </button>
          )}
          {!isClient && !user.hasClientProfile && (
            <button onClick={() => nav('become-client')} className={linkCls('become-client')}>
              {t('becomeClient')}
            </button>
          )}
        </div>

        {/* Language */}
        <div className="border-b border-gray-100 py-1 px-4">
          <p className="pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {t('langLabel')}
          </p>
          {[
            { code: 'en', flag: '🇺🇸', label: 'English' },
            { code: 'es', flag: '🇪🇸', label: 'Español' },
          ].map((l) => {
            const active = lang === l.code
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code as 'en' | 'es'); onClose() }}
                className="w-full flex items-center gap-2 py-1.5 text-left"
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${active ? 'bg-blue-600' : 'border border-gray-300'}`} />
                <span className={`text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {l.flag} {l.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Logout */}
        <div className="mt-auto py-3">
          <button
            onClick={() => { onLogout(); onClose() }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
