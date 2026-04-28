import { useState } from 'react'

interface Props {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (value: number) => void
}

export function StarRating({ value, max = 5, size = 'md', interactive = false, onChange }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }

  return (
    <span className={`inline-flex gap-0.5 ${sizes[size]}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <span
          key={star}
          className={`${interactive ? 'cursor-pointer select-none' : ''} ${
            star <= Math.round(display) ? 'text-yellow-400' : 'text-gray-300'
          }`}
          onMouseEnter={interactive ? () => setHover(star) : undefined}
          onMouseLeave={interactive ? () => setHover(null) : undefined}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
        >
          ★
        </span>
      ))}
    </span>
  )
}
