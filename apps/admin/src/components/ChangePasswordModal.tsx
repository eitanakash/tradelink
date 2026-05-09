import { useState, useEffect } from 'react'
import { changePassword, resetUserPassword, apiFetch } from '../lib/api'

interface User {
  id: string
  email: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'own' | 'user'>('own')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Own password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Reset user password form
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<User[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    if (userSearchQuery.length > 0) {
      searchUsers(userSearchQuery)
    } else {
      setUserSearchResults([])
    }
  }, [userSearchQuery])

  const searchUsers = async (query: string) => {
    try {
      const res = await apiFetch(`/admin/users?q=${encodeURIComponent(query)}&page=1`)
      const data = await res.json()
      setUserSearchResults(data.users.map((u: any) => ({ id: u.id, email: u.email, name: u.name })))
    } catch {
      setUserSearchResults([])
    }
  }

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedUser || !resetPassword) {
      setError('Please select a user and enter a password')
      return
    }

    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await resetUserPassword(selectedUser.id, resetPassword)
      setSuccess(`Password reset for ${selectedUser.email}`)
      setSelectedUser(null)
      setResetPassword('')
      setUserSearchQuery('')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setTab('own')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === 'own'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Password
            </button>
            <button
              onClick={() => {
                setTab('user')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reset User
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          {tab === 'own' ? (
            <form onSubmit={handleChangeOwnPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={e => {
                      setUserSearchQuery(e.target.value)
                      setShowUserDropdown(true)
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showUserDropdown && userSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {userSearchResults.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user)
                            setUserSearchQuery('')
                            setShowUserDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 text-sm"
                        >
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedUser && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{selectedUser.name}</div>
                  <div className="text-xs text-gray-600">{selectedUser.email}</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
              <button
                type="submit"
                disabled={loading || !selectedUser}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
