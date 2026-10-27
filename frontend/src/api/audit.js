import { apiClient, unwrapPaginated } from '@/api/client.js'
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

/** Per-field comparators for mock sorting, mirroring ChangeLogSortColumns /
 * DownloadLogSortColumns in backend/api/database.go. */
const MOCK_AUDIT_SORT_ACCESSORS = {
  changed_at: (log) => new Date(log.changed_at).getTime(),
  created_at: (log) => new Date(log.created_at).getTime(),
  user_id: (log) => log.user_id,
}

/**
 * In-memory equivalent of getAuditLogsDB (backend): sort then slice.
 *
 * @param {Array<object>} logs
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} [options]
 * @param {string} defaultSort
 */
function mockQueryAuditLogs(logs, options = {}, defaultSort = 'changed_at') {
  const { page = 1, limit = 10, sort = defaultSort, order = 'desc' } = options
  const getValue = MOCK_AUDIT_SORT_ACCESSORS[sort] ?? MOCK_AUDIT_SORT_ACCESSORS[defaultSort]
  const dir = order === 'asc' ? 1 : -1

  const result = [...logs].sort((a, b) => {
    const aValue = getValue(a)
    const bValue = getValue(b)
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * dir
    return String(aValue).localeCompare(String(bValue), 'id', { sensitivity: 'base' }) * dir
  })

  const total = result.length
  const start = (page - 1) * limit

  return {
    items: result.slice(start, start + limit),
    meta: { page, page_size: limit, total, total_pages: Math.ceil(total / limit) },
  }
}

/**
 * Builds the query params shared by the three audit list endpoints.
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} options
 */
function auditParams({ page = 1, limit = 10, sort, order }) {
  const params = { page, limit }
  if (sort) params.sort = sort
  if (order) params.order = order
  return params
}

/**
 * Admin-only: fetches a page of profile field change history (username,
 * email, phone, company_name, role) across all accounts, sorted
 * server-side (see backend/api/admin_handlers.go AdminGetProfileChangeLogs).
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} [options]
 * @returns {Promise<{ items: ProfileChangeLog[], meta: import('@/types/api.js').PaginationMeta }>}
 */
export async function getProfileChangeLogs(options = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    return mockQueryAuditLogs(MOCK_PROFILE_CHANGE_LOGS, options, 'changed_at')
  }

  const response = await apiClient.get('/api/audit/profile-changes', {
    params: auditParams(options),
  })
  return unwrapPaginated(response)
}

/**
 * Admin-only: fetches a page of password change history across all accounts,
 * sorted server-side (see
 * backend/api/admin_handlers.go AdminGetPasswordChangeLogs).
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} [options]
 * @returns {Promise<{ items: PasswordChangeLog[], meta: import('@/types/api.js').PaginationMeta }>}
 */
export async function getPasswordChangeLogs(options = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    return mockQueryAuditLogs(MOCK_PASSWORD_CHANGE_LOGS, options, 'changed_at')
  }

  const response = await apiClient.get('/api/audit/password-changes', {
    params: auditParams(options),
  })
  return unwrapPaginated(response)
}

/**
 * Admin-only: fetches a page of attachment download history across all
 * accounts, sorted server-side (see
 * backend/api/admin_handlers.go AdminGetDownloadLogs).
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} [options]
 * @returns {Promise<{ items: DownloadLogEntry[], meta: import('@/types/api.js').PaginationMeta }>}
 */
export async function getDownloadLogs(options = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    return mockQueryAuditLogs(MOCK_DOWNLOAD_LOGS, options, 'created_at')
  }

  const response = await apiClient.get('/api/audit/downloads', { params: auditParams(options) })
  return unwrapPaginated(response)
}
