import { apiClient } from '@/api/client.js'
import {
  MOCK_DOWNLOAD_LOGS,
  MOCK_PASSWORD_CHANGE_LOGS,
  MOCK_PROFILE_CHANGE_LOGS,
} from '@/mocks/audit.js'

/**
 * @typedef {Object} ProfileChangeLog
 * @property {number} id
 * @property {number} user_id
 * @property {string} field_name
 * @property {string} old_value
 * @property {string} new_value
 * @property {string} changed_at
 * @property {string} ip_address
 */

/**
 * @typedef {Object} PasswordChangeLog
 * @property {number} id
 * @property {number} user_id
 * @property {string} changed_at
 * @property {string} ip_address
 */

/**
 * @typedef {Object} DownloadLogEntry
 * @property {number} id
 * @property {number} user_id
 * @property {number} attachment_id
 * @property {number} po_id
 * @property {string} ip_address
 * @property {string} created_at
 */

/**
 * Set VITE_USE_MOCKS=true in .env to develop against the in-memory mock
 * audit logs in src/mocks/audit.js without a running backend (same flag
 * as api/po.js and api/auth.js).
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS === 'true'
}

/**
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Admin-only: fetches profile field change history (username, email,
 * phone, company_name, role) across all accounts (see
 * backend/api/admin_handlers.go AdminGetProfileChangeLogs).
 *
 * @returns {Promise<ProfileChangeLog[]>}
 */
export async function getProfileChangeLogs() {
  if (shouldUseMocks()) {
    await delay(300)
    return MOCK_PROFILE_CHANGE_LOGS
  }

  const response = await apiClient.get('/api/audit/profile-changes')
  return response.data.data ?? []
}

/**
 * Admin-only: fetches password change history across all accounts (see
 * backend/api/admin_handlers.go AdminGetPasswordChangeLogs).
 *
 * @returns {Promise<PasswordChangeLog[]>}
 */
export async function getPasswordChangeLogs() {
  if (shouldUseMocks()) {
    await delay(300)
    return MOCK_PASSWORD_CHANGE_LOGS
  }

  const response = await apiClient.get('/api/audit/password-changes')
  return response.data.data ?? []
}

/**
 * Admin-only: fetches attachment download history across all accounts
 * (see backend/api/admin_handlers.go AdminGetDownloadLogs).
 *
 * @returns {Promise<DownloadLogEntry[]>}
 */
export async function getDownloadLogs() {
  if (shouldUseMocks()) {
    await delay(300)
    return MOCK_DOWNLOAD_LOGS
  }

  const response = await apiClient.get('/api/audit/downloads')
  return response.data.data ?? []
}
