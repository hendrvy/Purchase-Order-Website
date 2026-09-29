import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadAttachmentPreviewUrl } from '@/api/attachments.js'

/**
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * @param {string} [mimeType]
 * @returns {boolean}
 */
function isImageMime(mimeType) {
  return mimeType?.startsWith('image/') ?? false
}

/**
 * Full-screen modal that previews a single uploaded attachment (image
 * rendered directly, PDF/other files rendered in an iframe). Fetches the
 * file lazily (as a blob, see api/attachments.js) whenever `attachment`
 * changes, and revokes the object URL on close/unmount to avoid leaking
 * memory.
 *
 * @param {{ attachment: Attachment | null, onClose: () => void }} props
 */
export function AttachmentPreviewModal({ attachment, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl(null)
      setError(null)
      return
    }

    let revoke = () => {}
    let cancelled = false

    setIsLoading(true)
    setError(null)

    loadAttachmentPreviewUrl(attachment)
      .then((result) => {
        if (cancelled) {
          result.revoke()
          return
        }
        revoke = result.revoke
        setPreviewUrl(result.url)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Gagal memuat file lampiran.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      revoke()
    }
  }, [attachment])

  if (!attachment) return null

  const isImage = isImageMime(attachment.mime_type)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="truncate text-sm font-medium text-gray-800">{attachment.filename}</p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-b-xl bg-gray-50">
          {isLoading && (
            <Loader2 size={28} className="animate-spin text-gray-400" />
          )}

          {!isLoading && error && (
            <p className="px-6 text-center text-sm text-red-600">{error}</p>
          )}

          {!isLoading && !error && previewUrl && (
            isImage ? (
              <img
                src={previewUrl}
                alt={attachment.filename}
                className="h-full w-full object-contain"
              />
            ) : (
              <iframe src={previewUrl} title={attachment.filename} className="h-full w-full" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
