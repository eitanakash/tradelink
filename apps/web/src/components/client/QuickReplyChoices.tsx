interface Props {
  options: string[]
  disabled: boolean
  onSelect: (answer: string) => void
}

export function QuickReplyChoices({ options, disabled, onSelect }: Props) {
  if (options.length < 2 || options.length > 4) return null
  return (
    <div className="grid w-full grid-cols-2 gap-2 pt-1" aria-label="Suggested answers">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white"
        >
          {option}
        </button>
      ))}
    </div>
  )
}
