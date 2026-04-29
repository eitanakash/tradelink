import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Conversation, Message } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { wsClient } from '../../services/websocket'

interface Props {
  conversation: Conversation
  userId: string
  onBack: () => void
}

export function ConversationView({ conversation, userId, onBack }: Props) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const token = localStorage.getItem('token')

  const other =
    conversation.client.user.id === userId
      ? conversation.contractor.user
      : conversation.client.user

  const load = () => {
    fetch(`${API_URL}/conversations/${conversation.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.messages) setMessages(data.messages) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setMessages([])
    setLoading(true)
    load()
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const off = wsClient.on('NEW_MESSAGE', (data: unknown) => {
      const d = data as { conversationId: string; message: Message }
      if (d.conversationId === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === d.message.id)) return prev
          return [...prev, d.message]
        })
      }
    })
    return off
  }, [conversation.id])

  const send = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    try {
      const res = await fetch(`${API_URL}/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      })
      const msg = await res.json()
      if (res.ok) setMessages((prev) => [...prev, msg])
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onBack} className="sm:hidden text-gray-500 hover:text-gray-700 mr-1">←</button>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
          {other.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{other.name}</p>
          <p className="text-xs text-gray-500 truncate">{conversation.job.category.icon} {conversation.job.title}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8">{t('common.loading')}</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t('conversation.noMessages')}</p>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.senderId === userId
            const isSystem = msg.messageType === 'SYSTEM'
            const prevMsg = messages[i - 1]
            const showTime =
              !prevMsg ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-xs text-gray-400 italic bg-gray-50 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              )
            }

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-center text-xs text-gray-400 mb-2">{formatTime(msg.createdAt)}</p>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                    {msg.readAt && isMine && i === messages.length - 1 && (
                      <p className="text-[10px] opacity-70 text-right mt-0.5">{t('conversation.read')}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('conversation.messagePlaceholder')}
            rows={1}
            className="flex-1 px-3.5 py-2.5 bg-gray-100 border border-transparent rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('conversation.enterToSend')}</p>
      </div>
    </div>
  )
}
