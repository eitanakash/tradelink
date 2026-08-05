import { useEffect, useRef, useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { AvatarDropdown } from './AvatarDropdown'
import { MobileMenu } from './MobileMenu'
import { NotificationBell } from '../NotificationBell'
import { useT } from '../../lib/i18n'
import { API_URL } from '../../lib/api'

type Lang = 'en' | 'es'

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
]

interface Props {
  user: UserProfile
  activeMode: ActiveMode
  activePage: string
  msgUnread: number
  notifUnread: number
  onNotifRead: () => void
  onModeChange: (mode: ActiveMode) => void
  onNavigate: (page: string) => void
  onLogout: () => void
}

export function Navbar({
  user,
  activeMode,
  activePage,
  msgUnread,
  notifUnread,
  onNotifRead,
  onModeChange,
  onNavigate,
  onLogout,
}: Props) {
  const { lang, setLang, t } = useT()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showFindContractors, setShowFindContractors] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const isClient = activeMode === 'CLIENT'
  const initial = user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then<Record<string, string>>((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (data.showFindContractors === 'true') {
          setShowFindContractors(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectLang = (code: Lang) => {
    setLang(code)
    setShowLangMenu(false)
  }

  const navLinkCls = (page: string) =>
    `text-sm font-medium pb-0.5 transition-colors ${
      activePage === page
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-600 hover:text-gray-900'
    }`

  const homeNav = () => {
    if (isClient) onNavigate('my-jobs')
    else onNavigate('browse-jobs')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={homeNav}
          className="text-xl font-bold text-blue-600 shrink-0 mr-2"
        >
          Tradelink
        </button>

        {/* Desktop center nav */}
        <div className="hidden md:flex items-center gap-6 flex-1">
          {isClient ? (
            <>
              <button onClick={() => onNavigate('my-jobs')} className={navLinkCls('my-jobs')}>
                {t('navMyJobs')}
              </button>
              <button onClick={() => onNavigate('post-job')} className={navLinkCls('post-job')}>
                {t('navPostJob')}
              </button>
              {showFindContractors && (
                <button onClick={() => onNavigate('find-contractors')} className={navLinkCls('find-contractors')}>
                  {t('navFindContractors')}
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => onNavigate('browse-jobs')} className={navLinkCls('browse-jobs')}>
                {t('navBrowseJobs')}
              </button>
              <button onClick={() => onNavigate('my-quotes')} className={navLinkCls('my-quotes')}>
                {t('navMyQuotes')}
              </button>
              <button onClick={() => onNavigate('my-profile')} className={navLinkCls('my-profile')}>
                {t('navMyProfile')}
              </button>
            </>
          )}
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Messages icon */}
          <button
            onClick={() => onNavigate('messages')}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Messages"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            {msgUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {msgUnread > 9 ? '9+' : msgUnread}
              </span>
            )}
          </button>

          {/* Language picker */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setShowLangMenu((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Language"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => selectLang(l.code)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                      lang === l.code ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                    {lang === l.code && <span className="ml-auto text-blue-600 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <NotificationBell />

          {/* Desktop: avatar + dropdown */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-1.5 ml-1 pl-1 rounded-lg hover:bg-gray-100 transition-colors py-1 pr-2"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <AvatarDropdown
                user={user}
                activeMode={activeMode}
                showFindContractors={showFindContractors}
                onModeChange={onModeChange}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <MobileMenu
          user={user}
          activeMode={activeMode}
          activePage={activePage}
          msgUnread={msgUnread}
          notifUnread={notifUnread}
          showFindContractors={showFindContractors}
          onModeChange={onModeChange}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onClose={() => setShowMobileMenu(false)}
        />
      )}
    </nav>
  )
}
