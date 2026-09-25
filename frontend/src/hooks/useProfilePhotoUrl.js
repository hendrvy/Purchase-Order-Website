import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client.js'
import { getProfilePhotoEndpoint } from '@/api/profile.js'

/**
 * Loads a company's profile photo as a local object URL, since `GET
 * /api/companies/:id/photo` sits behind AuthMiddleware and therefore
 * requires the `Authorization: Bearer <token>` header - something a plain
 * `<img src>` can't send (same constraint as PO attachment previews, see
 * api/attachments.js). Fetches lazily whenever `companyId`/`photoPath`
 * change, and revokes the previous object URL to avoid leaking memory.
 *
 * @param {number | undefined} companyId
 * @param {string | undefined} photoPath - Pass `user.photo_path` so the hook re-fetches whenever the photo actually changes (upload/remove).
 * @returns {string | null} object URL, or null while loading / if there is no photo.
 */
export function useProfilePhotoUrl(companyId, photoPath) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!companyId || !photoPath) {
      setUrl(null)
      return
    }

    let objectUrl = null
    let cancelled = false

    apiClient
      .get(getProfilePhotoEndpoint(companyId), { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [companyId, photoPath])

  return url
}
