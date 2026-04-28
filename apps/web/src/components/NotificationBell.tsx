import { useEffect, useRef, useState } from 'react'
import type { AppNotification } from '@tradelink/types'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../lib/api'
import { timeAgo } from '../lib/date'
import { wsClient } from '../services/websocket'

const ICONS: Record<string, string> = {
  NEW_QUOTE: '📋',
  QUOTE_ACCEPTED: '🎉',
  QUOTE_REJECTED: '📭',
  NEW_MESSAGE: '💬',
  JOB_AWARDED: '🏆',
  JOB_COMPLETED: '✅',
  QUESTION_ANSWERED: '💡',
  NEW_JOB_IN_AREA: '🔔',
}

export function NotificationBell() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('token')

  const unreadCount = notifications.filter((n) => !n.readAt).length

  const load = () => {
    fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotifications(data) })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const off = wsClient.on('NEW_NOTIFICATION', (data) => {
      setNotifications((prev) => [data as AppNotification, ...prev])
    })
    return off
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
  }

  const markAllRead = async () => {
    await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline font-medium">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">{t('notifications.none')}</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); setOpen(false) }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.readAt ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5">{ICONS[n.type] ?? '🔔'}</span>
                    <div className="min-w-0">
                      <p className={`text-sm ${!n.readAt ? 'font-semibold text-gray-900' : 'text-gray-700'} truncate`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.readAt && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
