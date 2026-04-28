import { useEffect, useState } from 'react'
import type { Conversation, Message } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { timeAgo } from '../../lib/date'
import { wsClient } from '../../services/websocket'
import { ConversationView } from './ConversationView'

interface Props {
  userId: string
  initialConversationId?: string | null
}

export function Inbox({ userId, initialConversationId }: Props) {
  const { t } = useT()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  const load = () => {
    fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setConversations(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const off = wsClient.on('NEW_MESSAGE', (data: unknown) => {
      const d = data as { conversationId: string; message: Message }
      const convId = d.conversationId
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage: d.message,
                lastMessageAt: d.message.createdAt,
                unreadCount: selectedId === convId ? 0 : c.unreadCount + 1,
              }
            : c
        )
        return [...updated].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      })
    })
    return off
  }, [selectedId])

  useEffect(() => {
    if (initialConversationId) setSelectedId(initialConversationId)
  }, [initialConversationId])

  const selected = conversations.find((c) => c.id === selectedId)

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>

  return (
    <div className="flex gap-0 h-[calc(100vh-160px)] min-h-96">
      {/* Sidebar */}
      <div
        className={`flex flex-col ${selectedId ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 border-r border-gray-200 shrink-0`}
      >
        <h2 className="text-lg font-bold text-gray-900 px-4 py-3 border-b border-gray-100">Messages</h2>
        {conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-gray-500">{t('noConversations')}</p>
              <p className="text-xs text-gray-400 mt-1">Start by messaging a contractor on a job.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {conversations.map((conv) => {
              const other =
                conv.client.user.id === userId ? conv.contractor.user : conv.client.user
              const isActive = conv.id === selectedId
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedId(conv.id)
                    setConversations((prev) =>
                      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                    )
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    isActive ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {other.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-sm truncate ${
                          conv.unreadCount > 0
                            ? 'font-bold text-gray-900'
                            : 'font-medium text-gray-700'
                        }`}
                      >
                        {other.name}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {timeAgo(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {conv.job.category.icon} {conv.job.title}
                    </p>
                    {conv.lastMessage && (
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          conv.unreadCount > 0
                            ? 'font-semibold text-gray-800'
                            : 'text-gray-400'
                        }`}
                      >
                        {conv.lastMessage.senderId === userId ? 'You: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Conversation panel */}
      <div className={`flex-1 ${selectedId ? 'flex' : 'hidden sm:flex'} flex-col`}>
        {selected ? (
          <ConversationView
            conversation={selected}
            userId={userId}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm">{t('selectConversation')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
