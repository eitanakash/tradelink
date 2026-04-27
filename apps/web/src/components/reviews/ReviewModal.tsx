import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../../lib/api'
import { StarRating } from '../StarRating'

interface Props {
  jobId: string
  jobTitle: string
  contractorName: string
  onClose: () => void
  onSubmitted: () => void
}

export function ReviewModal({ jobId, jobTitle, contractorName, onClose, onSubmitted }: Props) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [qualityRating, setQualityRating] = useState(0)
  const [communicationRating, setCommunicationRating] = useState(0)
  const [timelinessRating, setTimelinessRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const canSubmit = rating > 0 && title.trim().length > 0 && body.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          body: body.trim(),
          qualityRating: qualityRating || undefined,
          communicationRating: communicationRating || undefined,
          timelinessRating: timelinessRating || undefined,
          valueRating: valueRating || undefined,
        }),
      })
      if (res.ok) {
        onSubmitted()
      } else {
        const d = await res.json()
        setError(d.error ?? t('reviewModal.failedSubmit'))
      }
    } catch {
      setError(t('common.networkError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">{t('reviewModal.reviewTitle', { name: contractorName })}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6">{t('reviewModal.job', { title: jobTitle })}</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Overall rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('reviewModal.overallRating')} <span className="text-red-500">*</span>
              </label>
              <StarRating value={rating} size="lg" interactive onChange={setRating} />
              {rating > 0 && (
                <span className="text-xs text-gray-500 mt-1 block">
                  {['', t('reviewModal.poor'), t('reviewModal.fair'), t('reviewModal.good'), t('reviewModal.veryGood'), t('reviewModal.excellent')][rating]}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('reviewModal.reviewTitleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('reviewModal.reviewTitlePlaceholder')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('reviewModal.yourReview')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('reviewModal.reviewBodyPlaceholder')}
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{t('reviewModal.characters', { count: body.length })}</p>
            </div>

            {/* Sub-ratings */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">{t('reviewModal.detailedRatings')}</p>
              <div className="space-y-3">
                {[
                  { label: t('reviewModal.qualityOfWork'), value: qualityRating, onChange: setQualityRating },
                  { label: t('reviewModal.communication'), value: communicationRating, onChange: setCommunicationRating },
                  { label: t('reviewModal.timeliness'), value: timelinessRating, onChange: setTimelinessRating },
                  { label: t('reviewModal.valueForMoney'), value: valueRating, onChange: setValueRating },
                ].map(({ label, value, onChange }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-36 shrink-0">{label}</span>
                    <StarRating value={value} size="md" interactive onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('reviewModal.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? t('reviewModal.submitting') : t('reviewModal.submitReview')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
