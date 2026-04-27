import { useEffect, useState } from 'react'
import type { ContractorProfileData, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { FileUpload } from '../FileUpload'
import { StarRating } from '../StarRating'

export function ContractorProfile() {
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
          setError(data.error ?? 'Failed to load profile')
        }
      })
      .catch(() => setError('Network error'))
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
      if (!res.ok) { setSaveError(data.error ?? 'Failed to save'); return }
      setProfile(data)
      setEditingInfo(false)
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSavingInfo(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error || !profile) return <div className="text-center py-20 text-red-500">{error}</div>

  const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Your Profile</h2>
        <p className="text-sm text-gray-500">
          {profile.state} · {profile.trades.map((t) => `${t.icon} ${t.name}`).join(' · ') || 'No trades selected'}
        </p>
      </div>

      {/* Public profile link */}
      {profile.slug && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-700 font-medium">Your public profile: </span>
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
          <p className="text-xs text-gray-500">{profile.totalReviews} review{profile.totalReviews !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-gray-900">{profile.totalJobs}</p>
          <p className="text-xs text-gray-500">Jobs completed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          {profile.isVerified ? (
            <>
              <p className="text-sm font-semibold text-blue-600">Verified</p>
              <p className="text-xs text-gray-500">Contractor</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-400">Unverified</p>
              <p className="text-xs text-gray-500">Contractor</p>
            </>
          )}
        </div>
      </div>

      {/* Profile info */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Profile Info</h3>
          {!editingInfo && (
            <button
              onClick={startEdit}
              className="text-sm text-violet-600 hover:underline"
            >
              Edit
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
              <label className={labelCls}>Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Licensed Electrician with 10+ years experience"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients about yourself and your work"
                rows={4}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Years of Experience</label>
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
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditingInfo(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingInfo}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {savingInfo ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            {profile.headline ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Headline</p>
                <p className="text-sm text-gray-800">{profile.headline}</p>
              </div>
            ) : null}
            {profile.bio ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Bio</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              {profile.yearsExperience != null && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Experience</p>
                  <p className="text-sm text-gray-800">{profile.yearsExperience} years</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Phone</p>
                  <p className="text-sm text-gray-800">{profile.phone}</p>
                </div>
              )}
              {profile.website && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Website</p>
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
              <p className="text-sm text-gray-400 italic">No profile info added yet. Click Edit to add details.</p>
            )}
          </div>
        )}
      </section>

      {/* Portfolio photos */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Portfolio</h3>
        <p className="text-sm text-gray-500 mb-4">Photos of your previous work (up to 20)</p>
        <FileUpload
          category="PROFILE_PHOTO"
          existingFiles={photos}
          onUploaded={(f) => setPhotos((prev) => [...prev, f])}
          onRemoved={(id) => setPhotos((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={20}
          accept="image/*"
          label="Add portfolio photos"
        />
      </section>

      {/* Documents */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Documents</h3>
        <p className="text-sm text-gray-500 mb-4">License, certifications, insurance (up to 5 PDFs)</p>
        <FileUpload
          category="PROFILE_DOCUMENT"
          existingFiles={docs}
          onUploaded={(f) => setDocs((prev) => [...prev, f])}
          onRemoved={(id) => setDocs((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={5}
          accept="application/pdf"
          label="Add license or certification PDFs"
        />
      </section>
    </div>
  )
}
