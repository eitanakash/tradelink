import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiFetch('/admin/settings').then(r => r.json()).then(data => { setSettings(data); setLoading(false) })
  }, [])

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Maintenance Mode</p>
            <p className="text-sm text-gray-500">Temporarily disable the platform for all users</p>
          </div>
          <button onClick={() => update('maintenanceMode', settings.maintenanceMode === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenanceMode === 'true' ? 'bg-red-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenanceMode === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Allow New Registrations</p>
            <p className="text-sm text-gray-500">Allow new users to sign up</p>
          </div>
          <button onClick={() => update('allowNewRegistrations', settings.allowNewRegistrations === 'false' ? 'true' : 'false')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowNewRegistrations !== 'false' ? 'bg-green-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowNewRegistrations !== 'false' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Show Find Contractors Tab</p>
            <p className="text-sm text-gray-500">Show or hide the Find Contractors tab in client app navigation</p>
          </div>
          <button onClick={() => update('showFindContractors', settings.showFindContractors === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showFindContractors === 'true' ? 'bg-green-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showFindContractors === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
          {[
            { key: 'maxQuotesPerJob', label: 'Max Quotes per Job', type: 'number' },
            { key: 'jobExpiryDays', label: 'Job Expiry (days)', type: 'number' },
            { key: 'platformFeePercent', label: 'Platform Fee %', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} value={settings[key] ?? ''} onChange={e => update(key, e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors">
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
