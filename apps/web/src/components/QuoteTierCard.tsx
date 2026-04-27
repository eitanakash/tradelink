import type { QuoteTier } from '@tradelink/types'

export function QuoteTierCard({ tier }: { tier: QuoteTier }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{tier.name}</h4>
        <span className="text-xl font-bold text-violet-700">${tier.price.toLocaleString()}</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        <span>⏱ {tier.duration}</span>
        {tier.warranty && <span>🛡 {tier.warranty}</span>}
      </div>
      {tier.inclusions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Includes</p>
          <ul className="space-y-1">
            {tier.inclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tier.exclusions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Excludes</p>
          <ul className="space-y-1">
            {tier.exclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
