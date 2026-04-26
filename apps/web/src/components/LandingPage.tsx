import { useState } from 'react'
import type { UserProfile, ActiveMode } from '@tradelink/types'
import { AuthModal } from './AuthModal'

interface Props {
  onAuth: (token: string, user: UserProfile) => void
}

export function LandingPage({ onAuth }: Props) {
  const [initialRole, setInitialRole] = useState<ActiveMode | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">Tradelink</h1>
        <p className="text-xl text-blue-200">Connect clients with skilled contractors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        <button
          onClick={() => setInitialRole('CLIENT')}
          className="flex-1 flex flex-col items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl px-8 py-10 transition-all duration-200 backdrop-blur-sm group"
        >
          <span className="text-5xl">🏠</span>
          <span className="text-lg font-semibold text-white">I need a service</span>
          <span className="text-sm text-blue-200 group-hover:text-white transition-colors">
            Post jobs, hire contractors
          </span>
        </button>

        <button
          onClick={() => setInitialRole('CONTRACTOR')}
          className="flex-1 flex flex-col items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl px-8 py-10 transition-all duration-200 backdrop-blur-sm group"
        >
          <span className="text-5xl">🔧</span>
          <span className="text-lg font-semibold text-white">I am a contractor</span>
          <span className="text-sm text-blue-200 group-hover:text-white transition-colors">
            Find work, grow your business
          </span>
        </button>
      </div>

      <p className="mt-8 text-sm text-blue-300">You can always add the other role later</p>

      {initialRole && (
        <AuthModal
          initialRole={initialRole}
          onClose={() => setInitialRole(null)}
          onSuccess={onAuth}
        />
      )}
    </div>
  )
}
