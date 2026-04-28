import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../lib/api'
import { useT } from '../lib/i18n'

interface Notification {
  id: string
  title: string
  body: string
}

interface Props {
  unread: number
  onRead: () => void
}

export function NotificationBell({ unread, onRead }: Props) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token')
    await fetch(`${API_URL}/notifications/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    onRead()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">{t('notifications')}</span>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('markAllRead')}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-6">{t('loading')}</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">{t('noNotifications')}</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
