import { useEffect, useRef, useState } from 'react'
import type { AccountProfile } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { US_STATES } from '../../lib/states'

interface Props {
  onUserUpdate: (patch: { name: string; firstName: string | null; lastName: string | null; avatar: string | null }) => void
  onLogout: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400'

export function AccountSettings({ onUserUpdate, onLogout }: Props) {
  const { t } = useT()
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  // Address
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrMsg, setAddrMsg] = useState('')

  // Avatar
  const avatarRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // Change email
  const [emailPassword, setEmailPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Change password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // Delete account
  const [deletePassword, setDeletePassword] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/account/me`, { headers })
      .then((r) => r.json())
      .then((data: AccountProfile) => {
        setProfile(data)
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
        setPhone(data.phone ?? '')
        setAddressLine1(data.addressLine1 ?? '')
        setAddressLine2(data.addressLine2 ?? '')
        setCity(data.city ?? '')
        setState(data.state ?? '')
        setZipCode(data.zipCode ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveInfo = async () => {
    setSavingInfo(true)
    setInfoMsg('')
    try {
      const res = await fetch(`${API_URL}/account/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setInfoMsg(data.error ?? 'Failed to save'); return }
      setProfile((p) => p ? { ...p, ...data } : p)
      onUserUpdate({ name: data.name, firstName: data.firstName, lastName: data.lastName, avatar: data.avatar })
      setInfoMsg('Saved!')
    } catch {
      setInfoMsg(t('networkError'))
    } finally {
      setSavingInfo(false)
    }
  }

  const saveAddress = async () => {
    setSavingAddr(true)
    setAddrMsg('')
    try {
      const res = await fetch(`${API_URL}/account/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLine1: addressLine1.trim() || null,
          addressLine2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state || null,
          zipCode: zipCode.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddrMsg(data.error ?? 'Failed to save'); return }
      setProfile((p) => p ? { ...p, ...data } : p)
      setAddrMsg('Saved!')
    } catch {
      setAddrMsg(t('networkError'))
    } finally {
      setSavingAddr(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    setAvatarLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${API_URL}/account/avatar`, { method: 'POST', headers, body: form })
      const data = await res.json()
      if (!res.ok) return
      setProfile((p) => p ? { ...p, avatar: data.avatar } : p)
      onUserUpdate({ name: profile?.name ?? '', firstName: profile?.firstName ?? null, lastName: profile?.lastName ?? null, avatar: data.avatar })
    } catch {}
    finally { setAvatarLoading(false) }
  }

  const removeAvatar = async () => {
    setAvatarLoading(true)
    try {
      await fetch(`${API_URL}/account/avatar`, { method: 'DELETE', headers })
      setProfile((p) => p ? { ...p, avatar: null } : p)
      onUserUpdate({ name: profile?.name ?? '', firstName: profile?.firstName ?? null, lastName: profile?.lastName ?? null, avatar: null })
    } catch {}
    finally { setAvatarLoading(false) }
  }

  const sendEmailChange = async () => {
    setSendingEmail(true)
    setEmailMsg('')
    try {
      const res = await fetch(`${API_URL}/account/change-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: emailPassword, newEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setEmailMsg(data.error ?? 'Failed'); return }
      setEmailMsg(t('verificationSent'))
      setEmailPassword('')
      setNewEmail('')
    } catch {
      setEmailMsg(t('networkError'))
    } finally {
      setSendingEmail(false)
    }
  }

  const changePassword = async () => {
    setSavingPw(true)
    setPwMsg('')
    try {
      const res = await fetch(`${API_URL}/account/change-password`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) { setPwMsg(data.error ?? 'Failed'); return }
      setPwMsg(t('passwordUpdated'))
      setCurrentPw('')
      setNewPw('')
    } catch {
      setPwMsg(t('networkError'))
    } finally {
      setSavingPw(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    setDeleteMsg('')
    try {
      const res = await fetch(`${API_URL}/account/me`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteMsg(data.error ?? 'Failed'); return }
      localStorage.removeItem('token')
      localStorage.removeItem('activeMode')
      onLogout()
    } catch {
      setDeleteMsg(t('networkError'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (!profile) return null

  const initials = (profile.firstName?.[0] ?? profile.name?.[0] ?? '?').toUpperCase()
  const displayName = profile.name || profile.email

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('accountSettings')}</h1>

      {/* Avatar + name header */}
      <Section title={t('personalInfo')}>
        {/* Avatar row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarLoading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('changeAvatar')}
            </button>
            {profile.avatar && (
              <button
                onClick={removeAvatar}
                disabled={avatarLoading}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {t('removeAvatar')}
              </button>
            )}
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('firstNameLabel')}>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label={t('lastNameLabel')}>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label={t('phoneLabel')}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className={inputCls}
          />
        </Field>

        {infoMsg && (
          <p className={`text-sm mb-3 ${infoMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
            {infoMsg}
          </p>
        )}
        <button
          onClick={saveInfo}
          disabled={savingInfo}
          className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {savingInfo ? t('saving') : t('saveChanges')}
        </button>
      </Section>

      {/* Address */}
      <Section title={t('addressSection')}>
        <Field label={t('addressLine1Label')}>
          <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
        </Field>
        <Field label={t('addressLine2Label')}>
          <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cityLabel2')}>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
          </Field>
          <Field label={t('stateLabel2')}>
            <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
              <option value="">{t('selectState')}</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('zipCodeLabel')}>
          <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={inputCls} />
        </Field>

        {addrMsg && (
          <p className={`text-sm mb-3 ${addrMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
            {addrMsg}
          </p>
        )}
        <button
          onClick={saveAddress}
          disabled={savingAddr}
          className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {savingAddr ? t('saving') : t('saveChanges')}
        </button>
      </Section>

      {/* Change email */}
      <Section title={t('changeEmail')}>
        <Field label={t('currentEmailLabel')}>
          <input type="email" value={profile.email} disabled className={inputCls} />
        </Field>
        <Field label={t('newEmailLabel')}>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('confirmWithPassword')}>
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        {emailMsg && (
          <p className={`text-sm mb-3 ${emailMsg === t('verificationSent') ? 'text-green-600' : 'text-red-600'}`}>
            {emailMsg}
          </p>
        )}
        <button
          onClick={sendEmailChange}
          disabled={sendingEmail || !newEmail || !emailPassword}
          className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {sendingEmail ? t('sending') : t('sendVerification')}
        </button>
      </Section>

      {/* Change password */}
      <Section title={t('changePassword')}>
        <Field label={t('currentPasswordLabel')}>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('newPasswordLabel')}>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder={t('newPasswordHint')}
            className={inputCls}
          />
        </Field>
        {pwMsg && (
          <p className={`text-sm mb-3 ${pwMsg === t('passwordUpdated') ? 'text-green-600' : 'text-red-600'}`}>
            {pwMsg}
          </p>
        )}
        <button
          onClick={changePassword}
          disabled={savingPw || !currentPw || newPw.length < 8}
          className="px-5 py-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {savingPw ? t('saving') : t('updatePassword')}
        </button>
      </Section>

      {/* Danger zone */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 mb-4">
        <h2 className="text-base font-semibold text-red-700 mb-2">{t('dangerZone')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('deleteAccountWarning')}</p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="px-5 py-2 border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
          >
            {t('deleteAccount')}
          </button>
        ) : (
          <div className="space-y-3">
            <Field label={t('deleteAccountConfirm')}>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={inputCls}
              />
            </Field>
            {deleteMsg && <p className="text-sm text-red-600">{deleteMsg}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDelete(false); setDeletePassword(''); setDeleteMsg('') }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || !deletePassword}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? t('deleting') : t('deleteAccount')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
