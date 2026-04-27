import { useCallback, useEffect, useRef, useState } from 'react'

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`(.+?)`/gs, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim()
}

export interface TextToSpeechState {
  isSpeaking: boolean
  isSupported: boolean
  voiceEnabled: boolean
}

export interface TextToSpeechActions {
  speak: (text: string) => void
  stop: () => void
  toggle: () => void
}

export function useTextToSpeech(): TextToSpeechState & TextToSpeechActions {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('tts_enabled') === 'true' } catch { return false }
  })
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  const speak = useCallback((text: string) => {
    if (!isSupported || !voiceEnabled) return
    stop()

    const cleaned = stripMarkdown(text)
    if (!cleaned) return

    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.rate = 0.95
    utterance.lang = 'en-US'

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find(v => v.lang === 'en-US' && v.localService) ??
        voices.find(v => v.lang === 'en-US') ??
        voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
    }

    loadVoices()
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, voiceEnabled, stop])

  const toggle = useCallback(() => {
    setVoiceEnabled(prev => {
      const next = !prev
      try { localStorage.setItem('tts_enabled', String(next)) } catch {}
      if (!next) stop()
      return next
    })
  }, [stop])

  return { isSpeaking, isSupported, voiceEnabled, speak, stop, toggle }
}
