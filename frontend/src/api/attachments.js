/**
 * @import { Attachment } from '@/types/attachment.js'
 */

import { apiClient, ApiError } from '@/api/client.js'

/**
 * Set VITE_USE_MOCKS=true in .env to develop against the in-memory mock
 * PO list without a running backend (same flag as api/po.js and
 * api/auth.js).
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS === 'true'
}

/**
 * Loads an attachment's file bytes and returns a local object URL that can
 * be used as an `<img src>` / `<iframe src>`.
 *
 * The real backend serves files via `GET /api/download/:id`
 * (backend/api/file_handlers.go DownloadFile), which sits behind
 * `AuthMiddleware` and therefore requires the `Authorization: Bearer
 * <token>` header - something a plain `<img>`/`<a>` tag cannot send. So we
 * fetch it as a blob through the authenticated axios client instead, then
 * hand the caller an object URL to render.
 *
 * In mock mode (`VITE_USE_MOCKS=true`), `attachment.filepath` is already a
 * local `blob:` URL created by `buildMockAttachments` in api/po.js at
 * upload time, so we can just return it as-is without a network call.
 *
 * Callers are responsible for calling `URL.revokeObjectURL(url)` (for the
 * real-backend path) once the preview is closed, to avoid leaking memory.
 *
 * @param {Attachment} attachment
 * @returns {Promise<{ url: string, revoke: () => void }>}
 */
export async function loadAttachmentPreviewUrl(attachment) {
  if (shouldUseMocks() || attachment.filepath?.startsWith('blob:')) {
    return { url: attachment.filepath, revoke: () => {} }
  }

  try {
    const response = await apiClient.get(`/api/download/${attachment.id}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Gagal memuat file lampiran.')
  }
}
