import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContractorProfileData, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { useT } from '../../lib/i18n'
import { FileUpload } from '../FileUpload'
import { StarRating } from '../StarRating'

export function ContractorProfile() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<ContractorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<FileUploadRecord[]>([])
  const [docs, setDocs] = useState<FileUploadRecord[]>([])

  // Edit state
  const [editingInfo, setEditingInfo] = useState(false)
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [saveError, setSaveError] = useState('')

  const token = localStorage.getItem('token')

  const loadProfile = () => {
    fetch(`${API_URL}/contractor/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setProfile(data)
          setPhotos((data.profileFiles ?? []).filter((f: FileUploadRecord) => f.category === 'PROFILE_PHOTO'))
          setDocs((data.profileFiles ?? []).filter((f: FileUploadRecord) => f.category === 'PROFILE_DOCUMENT'))
        } else {
          setError(data.error ?? t('contractorProfile.failedLoad'))
        }
      })
      .catch(() => setError(t('common.networkError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const startEdit = () => {
    if (!profile) return
    setHeadline(profile.headline ?? '')
    setBio(profile.bio ?? '')
    setYearsExperience(profile.yearsExperience != null ? String(profile.yearsExperience) : '')
    setWebsite(profile.website ?? '')
    setPhone(profile.phone ?? '')
    setSaveError('')
    setEditingInfo(true)
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingInfo(true)
    setSaveError('')
    try {
      const res = await fetch(`${API_URL}/contractor/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : null,
          website: website.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error ?? t('contractorProfile.failedSave')); return }
      setProfile(data)
      setEditingInfo(false)
    } catch {
      setSaveError(t('common.networkError'))
    } finally {
      setSavingInfo(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
  if (error || !profile) return <div className="text-center py-20 text-red-500">{error}</div>

  const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('contractorProfile.yourProfile')}</h2>
        <p className="text-sm text-gray-500">
          {profile.state} · {profile.trades.map((tr) => `${tr.icon} ${tr.name}`).join(' · ') || t('contractorProfile.noTradesSelected')}
        </p>
      </div>

      {/* Public profile link */}
      {profile.slug && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-700 font-medium">{t('contractorProfile.publicProfile')}</span>
          <span className="text-blue-600">/contractors/{profile.slug}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <StarRating value={profile.averageRating} size="sm" />
          </div>
          <p className="text-lg font-bold text-gray-900">{profile.averageRating.toFixed(1)}</p>
          <p className="text-xs text-gray-500">{profile.totalReviews} {t('contractorProfile.averageRating')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-gray-900">{profile.totalJobs}</p>
          <p className="text-xs text-gray-500">{t('contractorProfile.jobsCompleted')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          {profile.isVerified ? (
            <>
              <p className="text-sm font-semibold text-blue-600">{t('contractorProfile.verified')}</p>
              <p className="text-xs text-gray-500">{t('contractorProfile.contractor')}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-400">{t('contractorProfile.unverified')}</p>
              <p className="text-xs text-gray-500">{t('contractorProfile.contractor')}</p>
            </>
          )}
        </div>
      </div>

      {/* Profile info */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{t('contractorProfile.profileInfo')}</h3>
          {!editingInfo && (
            <button
              onClick={startEdit}
              className="text-sm text-violet-600 hover:underline"
            >
              {t('common.edit')}
            </button>
          )}
        </div>

        {editingInfo ? (
          <form onSubmit={handleSaveInfo} className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5">
            {saveError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div>
              <label className={labelCls}>{t('contractorProfile.headline')}</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={t('contractorProfile.headlinePlaceholder')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('contractorProfile.bio')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('contractorProfile.bioPlaceholder')}
                rows={4}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('contractorProfile.yearsExperience')}</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="e.g. 10"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('contractorProfile.phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('contractorProfile.phonePlaceholder')}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('contractorProfile.website')}</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t('contractorProfile.websitePlaceholder')}
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditingInfo(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('contractorProfile.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingInfo}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {savingInfo ? t('contractorProfile.saving') : t('contractorProfile.saveChanges')}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            {profile.headline ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{t('contractorProfile.headlineLabel')}</p>
                <p className="text-sm text-gray-800">{profile.headline}</p>
              </div>
            ) : null}
            {profile.bio ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{t('contractorProfile.bioLabel')}</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              {profile.yearsExperience != null && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{t('contractorProfile.experienceLabel')}</p>
                  <p className="text-sm text-gray-800">{t('contractorProfile.yearsCount', { count: profile.yearsExperience })}</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{t('contractorProfile.phone')}</p>
                  <p className="text-sm text-gray-800">{profile.phone}</p>
                </div>
              )}
              {profile.website && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{t('contractorProfile.website')}</p>
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
            {!profile.headline && !profile.bio && profile.yearsExperience == null && !profile.phone && !profile.website && (
              <p className="text-sm text-gray-400 italic">{t('contractorProfile.noProfileInfo')}</p>
            )}
          </div>
        )}
      </section>

      {/* Portfolio photos */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('contractorProfile.portfolio')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('contractorProfile.portfolioHelp')}</p>
        <FileUpload
          category="PROFILE_PHOTO"
          existingFiles={photos}
          onUploaded={(f) => setPhotos((prev) => [...prev, f])}
          onRemoved={(id) => setPhotos((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={20}
          accept="image/*"
          label={t('contractorProfile.addPortfolioPhotos')}
        />
      </section>

      {/* Documents */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('contractorProfile.documents')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('contractorProfile.documentsHelp')}</p>
        <FileUpload
          category="PROFILE_DOCUMENT"
          existingFiles={docs}
          onUploaded={(f) => setDocs((prev) => [...prev, f])}
          onRemoved={(id) => setDocs((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={5}
          accept="application/pdf"
          label={t('contractorProfile.addDocuments')}
        />
      </section>
    </div>
  )
}
