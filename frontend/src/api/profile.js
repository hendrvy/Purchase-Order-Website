/**
 * @import { User } from '@/types/user.js'
 */

import { apiClient } from '@/api/client.js'

/**
 * @typedef {Object} UpdateProfileInput
 * @property {string} [username]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [company_name]
 */

/**
 * @typedef {Object} UpdateProfileResult
 * @property {string} [token] - Only present when username/email/company_name changed (see backend/api/company_handlers.go UpdateCompanyProfile).
 * @property {User} user
 */

/**
 * Updates the given company's editable profile fields (username, email,
 * phone, company_name). Backend only applies fields that are non-empty and
 * different from the current value (see UpdateCompanyProfileRequest /
 * UpdateCompanyProfile in backend/api/company_handlers.go).
 *
 * If username/email/company_name changed, the backend reissues a JWT
 * (those fields are embedded in the token claims) - callers should swap it
 * into AuthContext via `updateUser`/token refresh so the session doesn't
 * carry stale claims.
 *
 * @param {number} companyId
 * @param {UpdateProfileInput} input
 * @returns {Promise<UpdateProfileResult>}
 */
export async function updateProfile(companyId, input) {
  const response = await apiClient.put(`/api/companies/${companyId}`, input)
  const { token, company } = response.data.data
  return { token: token || undefined, user: company }
}

/**
 * @param {{ current_password: string, new_password: string }} input
 * @returns {Promise<void>}
 */
export async function changePassword(input) {
  await apiClient.post('/api/change-password', {
    current_password: input.current_password,
    new_password: input.new_password,
  })
}

/**
 * Uploads (or replaces) a company's profile photo.
 *
 * @param {number} companyId
 * @param {File} file
 * @returns {Promise<User>}
 */
export async function uploadProfilePhoto(companyId, file) {
  const formData = new FormData()
  formData.append('photo', file)

  const response = await apiClient.post(`/api/companies/${companyId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}

/**
 * Removes a company's profile photo.
 *
 * @param {number} companyId
 * @returns {Promise<User>}
 */
export async function deleteProfilePhoto(companyId) {
  const response = await apiClient.delete(`/api/companies/${companyId}/photo`)
  return response.data.data
}

/**
 * Builds a viewable URL for a company's profile photo. Unlike PO
 * attachments (`/api/download/:id`), this endpoint (`GET
 * /api/companies/:id/photo`) still sits behind AuthMiddleware, so a plain
 * `<img src>` won't work directly - see `useProfilePhotoUrl` hook which
 * fetches it as a blob through the authenticated axios client instead.
 *
 * @param {number} companyId
 * @returns {string}
 */
export function getProfilePhotoEndpoint(companyId) {
  return `/api/companies/${companyId}/photo`
}
