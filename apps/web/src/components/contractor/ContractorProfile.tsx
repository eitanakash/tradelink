import { useEffect, useState } from 'react'
import type { ContractorProfileData, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../../lib/api'
import { FileUpload } from '../FileUpload'
import { useT } from '../../lib/i18n'

export function ContractorProfile() {
  const { t } = useT()
  const [profile, setProfile] = useState<ContractorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<FileUploadRecord[]>([])
  const [docs, setDocs] = useState<FileUploadRecord[]>([])

  const token = localStorage.getItem('token')

  useEffect(() => {
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
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>
  if (error || !profile) return <div className="text-center py-20 text-red-500">{error}</div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('yourProfile')}</h2>
        <p className="text-sm text-gray-500">
          {profile.state} · {profile.trades.map((tr) => `${tr.icon} ${tr.name}`).join(' · ') || t('noTradesSelected')}
        </p>
      </div>

      {/* Portfolio photos */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('portfolioSectionTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('portfolioSectionHint')}</p>
        <FileUpload
          category="PROFILE_PHOTO"
          existingFiles={photos}
          onUploaded={(f) => setPhotos((prev) => [...prev, f])}
          onRemoved={(id) => setPhotos((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={20}
          accept="image/*"
          label={t('addPortfolioPhotos')}
        />
      </section>

      {/* Documents */}
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">{t('documentsSectionTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('documentsSectionHint')}</p>
        <FileUpload
          category="PROFILE_DOCUMENT"
          existingFiles={docs}
          onUploaded={(f) => setDocs((prev) => [...prev, f])}
          onRemoved={(id) => setDocs((prev) => prev.filter((f) => f.id !== id))}
          maxFiles={5}
          accept="application/pdf"
          label={t('addDocumentsLabel')}
        />
      </section>
    </div>
  )
}
