import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL } from '../lib/api'

type PermissionState = 'granted' | 'denied' | 'prompt' | null

export interface VoiceInputState {
  isRecording: boolean
  isTranscribing: boolean
  isSupported: boolean
  permission: PermissionState
  error: string | null
  audioLevel: number      // 0–100
  duration: number        // seconds elapsed
  showWarning: boolean    // true at 50s
}

export interface VoiceInputActions {
  requestPermission: () => Promise<boolean>
  startRecording: () => Promise<void>
  stopRecording: (language?: string) => Promise<string | null>
  cancelRecording: () => void
  clearError: () => void
}

const MAX_DURATION = 60
const WARN_AT = 50

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return 'audio/webm'
}

export function useVoiceInput(): VoiceInputState & VoiceInputActions {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [permission, setPermission] = useState<PermissionState>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showWarning, setShowWarning] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopResolveRef = useRef<((transcript: string | null) => void) | null>(null)
  const langRef = useRef<string>('en')

  const isSupported = typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setAudioLevel(0)
    setDuration(0)
    setShowWarning(false)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setPermission('granted')
      return true
    } catch (err: any) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
      setPermission(denied ? 'denied' : 'prompt')
      setError(denied
        ? 'Microphone access was denied. Enable it in browser settings or type your message.'
        : 'No microphone detected. Please connect a microphone or type your message.')
      return false
    }
  }, [])

  const startLevelDetection = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setAudioLevel(Math.min(100, (avg / 80) * 100))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // AudioContext not available — skip level detection
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return
    setError(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermission('granted')
    } catch (err: any) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
      setPermission(denied ? 'denied' : 'prompt')
      setError(denied
        ? 'Microphone access was denied. Enable it in browser settings or type your message.'
        : 'No microphone detected. Please connect a microphone or type your message.')
      return
    }

    streamRef.current = stream
    chunksRef.current = []
    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    recorder.start(100)
    setIsRecording(true)
    startLevelDetection(stream)

    // Duration counter
    let secs = 0
    timerRef.current = setInterval(() => {
      secs++
      setDuration(secs)
    }, 1000)

    // Auto-stop timers
    warnTimerRef.current = setTimeout(() => setShowWarning(true), WARN_AT * 1000)
    maxTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, MAX_DURATION * 1000)
  }, [isRecording, isTranscribing, startLevelDetection])

  const stopRecording = useCallback((language = 'en'): Promise<string | null> => {
    langRef.current = language
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      stopResolveRef.current = resolve

      recorder.onstop = async () => {
        cleanup()
        setIsRecording(false)
        setIsTranscribing(true)

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        chunksRef.current = []

        if (blob.size < 1000) {
          setIsTranscribing(false)
          setError('Recording too short. Please try again.')
          stopResolveRef.current?.(null)
          return
        }

        try {
          const token = localStorage.getItem('token')
          const form = new FormData()
          form.append('audio', blob, `recording.${recorder.mimeType.split('/')[1]?.split(';')[0] ?? 'webm'}`)
          form.append('language', langRef.current)

          const res = await fetch(`${API_URL}/ai/transcribe`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
          stopResolveRef.current?.(data.transcript ?? null)
        } catch (err: any) {
          setError(err?.message ?? 'Could not understand audio. Please try again or type your message.')
          stopResolveRef.current?.(null)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.stop()
    })
  }, [cleanup])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    cleanup()
    setIsRecording(false)
    setIsTranscribing(false)
    chunksRef.current = []
    stopResolveRef.current?.(null)
  }, [cleanup])

  const clearError = useCallback(() => setError(null), [])

  return {
    isRecording, isTranscribing, isSupported,
    permission, error, audioLevel, duration, showWarning,
    requestPermission, startRecording, stopRecording, cancelRecording, clearError,
  }
}
