import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../../lib/api'
import { timeAgo } from '../../lib/date'
import { useT } from '../../lib/i18n'

interface Conversation {
  id: string
  job: { id: string; title: string }
  otherUser: { id: string; name: string }
  lastMessage: { content: string; createdAt: string } | null
  unreadCount: number
}

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
}

interface Props {
  userId: string
  initialConversationId?: string | null
}

export function Inbox({ userId, initialConversationId }: Props) {
  const { t } = useT()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data)
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingMsgs(true)
    fetch(`${API_URL}/conversations/${selectedId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data)
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !selectedId || sending) return
    setSending(true)
    setInput('')
    try {
      const res = await fetch(`${API_URL}/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setMessages((prev) => [...prev, data])
      }
    } catch {
      //
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)] min-h-0">
      {/* Conversation list */}
      <div className="w-64 shrink-0 bg-white border border-gray-200 rounded-2xl overflow-y-auto">
        {loadingConvs ? (
          <p className="text-sm text-gray-500 text-center py-6">{t('loading')}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">{t('noConversations')}</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                c.id === selectedId ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-900 truncate">{c.otherUser.name}</span>
                {c.unreadCount > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{c.job.title}</p>
              {c.lastMessage && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {c.lastMessage.content}
                </p>
              )}
              {c.lastMessage && (
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(c.lastMessage.createdAt)}</p>
              )}
            </button>
          ))
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-2xl min-h-0 overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            {t('selectConversation')}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              {selected && (
                <>
                  <p className="text-sm font-semibold text-gray-900">{selected.otherUser.name}</p>
                  <p className="text-xs text-gray-400">{selected.job.title}</p>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingMsgs ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('loading')}</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === userId
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p>{m.content}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
                          {timeAgo(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('typeMessage')}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('sendBtn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
