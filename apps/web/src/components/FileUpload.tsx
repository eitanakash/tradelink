import { useRef, useState } from 'react'
import type { FileCategory, FileUploadRecord } from '@tradelink/types'
import { API_URL } from '../lib/api'

interface Props {
  category: FileCategory
  jobId?: string
  quoteId?: string
  sessionId?: string
  onUploaded?: (file: FileUploadRecord) => void
  onRemoved?: (id: string) => void
  existingFiles?: FileUploadRecord[]
  maxFiles?: number
  accept?: string
  label?: string
  compact?: boolean
}

interface PendingFile {
  localId: string
  file: File
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
  result?: FileUploadRecord
  preview?: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <span className="text-2xl">🖼️</span>
  if (mimeType.startsWith('video/')) return <span className="text-2xl">🎬</span>
  if (mimeType === 'application/pdf') return <span className="text-2xl">📄</span>
  return <span className="text-2xl">📎</span>
}

function uploadWithProgress(
  formData: FormData,
  token: string,
  onProgress: (pct: number) => void,
): Promise<FileUploadRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'))
        } catch {
          reject(new Error('Upload failed'))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', `${API_URL}/uploads`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

export function FileUpload({
  category,
  jobId,
  quoteId,
  sessionId,
  onUploaded,
  onRemoved,
  existingFiles = [],
  maxFiles = 10,
  accept = 'image/*,video/mp4,video/quicktime,application/pdf',
  label = 'Drag files here or click to browse',
  compact = false,
}: Props) {
  const [pending, setPending] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('token') || ''

  const totalFiles = existingFiles.length + pending.filter((p) => p.status === 'done').length
  const canAdd = totalFiles < maxFiles

  const processFiles = async (files: File[]) => {
    const toAdd = files.slice(0, maxFiles - totalFiles)
    if (!toAdd.length) return

    const newPending: PendingFile[] = toAdd.map((file) => ({
      localId: Math.random().toString(36).slice(2),
      file,
      progress: 0,
      status: 'uploading',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setPending((prev) => [...prev, ...newPending])

    for (const pf of newPending) {
      const formData = new FormData()
      formData.append('file', pf.file)
      formData.append('category', category)
      if (jobId) formData.append('jobId', jobId)
      if (quoteId) formData.append('quoteId', quoteId)
      if (sessionId) formData.append('sessionId', sessionId)

      try {
        const result = await uploadWithProgress(formData, token, (pct) => {
          setPending((prev) =>
            prev.map((p) => (p.localId === pf.localId ? { ...p, progress: pct } : p)),
          )
        })
        setPending((prev) =>
          prev.map((p) =>
            p.localId === pf.localId ? { ...p, status: 'done', result, progress: 100 } : p,
          ),
        )
        onUploaded?.(result)
      } catch (err: any) {
        setPending((prev) =>
          prev.map((p) =>
            p.localId === pf.localId
              ? { ...p, status: 'error', error: err.message || 'Upload failed' }
              : p,
          ),
        )
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!canAdd) return
    processFiles(Array.from(e.dataTransfer.files))
  }

  const handleRemovePending = (localId: string) => {
    setPending((prev) => prev.filter((p) => p.localId !== localId))
  }

  const handleRemoveExisting = async (file: FileUploadRecord) => {
    const res = await fetch(`${API_URL}/uploads/${file.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) onRemoved?.(file.id)
  }

  const allDone = [...existingFiles, ...pending.filter((p) => p.status === 'done').map((p) => p.result!)]

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl transition-colors ${
            compact ? 'py-4 px-4' : 'py-8 px-6'
          } ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(Array.from(e.target.files))
              e.target.value = ''
            }}
          />
          <div className="text-center">
            <div className="text-2xl mb-1">📎</div>
            <p className="text-sm text-gray-600 font-medium">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {maxFiles - totalFiles} slot{maxFiles - totalFiles !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      )}

      {/* Uploading / errored files */}
      {pending.filter((p) => p.status !== 'done').length > 0 && (
        <div className="space-y-2">
          {pending
            .filter((p) => p.status !== 'done')
            .map((pf) => (
              <div key={pf.localId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                {pf.preview ? (
                  <img src={pf.preview} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <FileIcon mimeType={pf.file.type} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{pf.file.name}</p>
                  {pf.status === 'uploading' ? (
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${pf.progress}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 mt-0.5">{pf.error}</p>
                  )}
                </div>
                {pf.status === 'error' && (
                  <button
                    onClick={() => handleRemovePending(pf.localId)}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Uploaded files grid */}
      {allDone.length > 0 && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {allDone.map((file) => (
            <div key={file.id} className="relative group">
              {file.mimeType.startsWith('image/') ? (
                <img
                  src={file.url}
                  alt={file.filename}
                  className="w-full aspect-square object-cover rounded-xl border border-gray-200"
                />
              ) : (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center aspect-square bg-gray-100 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors p-2"
                >
                  <FileIcon mimeType={file.mimeType} />
                  <span className="text-xs text-gray-500 mt-1 text-center truncate w-full px-1">
                    {file.filename}
                  </span>
                  <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                </a>
              )}
              <button
                onClick={() => handleRemoveExisting(file)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex leading-none"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
