import { useEffect, useRef } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { useT } from '../../lib/i18n'

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  onModeChange: (mode: ActiveMode) => void
  onNavigate: (page: string) => void
  onLogout: () => void
  onClose: () => void
}

export function AvatarDropdown({ user, activeMode, onModeChange, onNavigate, onLogout, onClose }: Props) {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const isClient = activeMode === 'CLIENT'
  const initial = user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()

  const nav = (page: string) => {
    onNavigate(page)
    onClose()
  }

  const modeSwitch = () => {
    if (isClient) {
      if (user.hasContractorProfile) {
        onModeChange('CONTRACTOR')
      } else {
        onNavigate('become-contractor')
      }
    } else {
      if (user.hasClientProfile) {
        onModeChange('CLIENT')
      } else {
        onNavigate('become-client')
      }
    }
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name ?? user.email}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span
              className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isClient ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
              }`}
            >
              {isClient ? t('modeClient') : t('modeContractor')}
            </span>
          </div>
        </div>
      </div>

      {/* Mode nav links */}
      <div className="border-b border-gray-100 py-1">
        {isClient ? (
          <>
            <button onClick={() => nav('my-jobs')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('myJobsMenu')}
            </button>
            <button onClick={() => nav('find-contractors')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('findContractorsMenu')}
            </button>
            <button onClick={() => nav('messages')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('messagesMenu')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => nav('browse-jobs')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('browseJobsMenu')}
            </button>
            <button onClick={() => nav('my-quotes')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('myQuotesMenu')}
            </button>
            <button onClick={() => nav('messages')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              {t('messagesMenu')}
            </button>
          </>
        )}
      </div>

      {/* My Profile */}
      <div className="border-b border-gray-100 py-1">
        <button onClick={() => nav('my-profile')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          {t('myProfileMenu')}
        </button>
      </div>

      {/* Mode switch */}
      <div className="border-b border-gray-100 py-1">
        <button onClick={modeSwitch} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          {isClient
            ? user.hasContractorProfile
              ? t('switchToContractor')
              : t('becomeContractor')
            : user.hasClientProfile
            ? t('switchToClient')
            : t('becomeClient')}
        </button>
      </div>

      {/* Logout */}
      <div className="py-1">
        <button
          onClick={() => { onLogout(); onClose() }}
          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
