import { useTranslation } from 'react-i18next'

type PermissionState = 'granted' | 'denied' | 'prompt' | null

interface VoiceButtonProps {
  isRecording: boolean
  isTranscribing: boolean
  isSupported: boolean
  permission: PermissionState
  audioLevel: number
  duration: number
  showWarning: boolean
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  disabled?: boolean
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const BAR_HEIGHTS = [0.4, 0.65, 1, 0.65, 0.4]

export function VoiceButton({
  isRecording,
  isTranscribing,
  isSupported,
  audioLevel,
  duration,
  showWarning,
  onStart,
  onStop,
  onCancel,
  disabled,
}: VoiceButtonProps) {
  const { t } = useTranslation()
  if (!isSupported) return null

  // TRANSCRIBING state
  if (isTranscribing) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <div className="p-2.5 text-blue-500 rounded-lg">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  // RECORDING state
  if (isRecording) {
    const level = Math.max(0, Math.min(100, audioLevel))
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Timer */}
        <span className={`text-xs font-mono tabular-nums ${showWarning ? 'text-orange-500' : 'text-red-500'}`}>
          {formatDuration(duration)}
        </span>

        {/* Waveform bars */}
        <div className="flex items-center gap-0.5 h-5">
          {BAR_HEIGHTS.map((base, i) => {
            const height = Math.max(4, base * 8 + (level / 100) * base * 12)
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-red-500 transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>

        {/* Stop button (pulsing ring) */}
        <button
          onClick={onStop}
          className="relative p-2.5 rounded-lg shrink-0"
          title={t('voice.stopRecording')}
          aria-label="Stop recording"
        >
          <span className="absolute inset-0 rounded-lg bg-red-500 opacity-20 animate-ping" />
          <svg className="w-4 h-4 text-red-600 relative" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title={t('voice.cancelRecording')}
          aria-label={t('voice.cancelRecording')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  // IDLE state
  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      title={t('voice.voiceInput')}
      aria-label={t('voice.startRecording')}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  )
}
