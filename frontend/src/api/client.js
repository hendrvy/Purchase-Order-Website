import axios from 'axios'
import { clearAuthStorage, getStoredToken } from '@/lib/storage.js'

/**
 * Thrown for any failed API call so UI code can rely on a single,
 * consistent error shape instead of digging into axios internals.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.status]
   * @param {Record<string, string>} [options.errors] - Field-level validation errors.
   */
  constructor(message, { status, errors } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export const apiClient = axios.create({
  // Backend (backend/cmd/main.go) listens on :3455 by default, but nginx
  // proxies /api/* to it (see backend/docker/nginx.conf), so the frontend
  // always calls same-origin relative paths (e.g. apiClient.get('/api/...'))
  // - no absolute base URL needed, which also makes this work correctly
  // across every domain/port the app is deployed behind.
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      const message = data?.message ?? data?.error ?? 'Terjadi kesalahan pada server.'

      const isPublicEndpoint = error.config?.url === '/api/login'
      if (status === 401 && !isPublicEndpoint) {
        clearAuthStorage()
        window.location.href = '/login'
      }

      return Promise.reject(new ApiError(message, { status, errors: data?.errors }))
    }
    if (error.request) {
      return Promise.reject(
        new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', { status: 0 }),
      )
    }
    return Promise.reject(new ApiError(error.message ?? 'Terjadi kesalahan tak terduga.'))
  },
)

/** Fallback meta used when a paginated response is missing/empty. */
export const EMPTY_PAGINATION_META = {
  page: 1,
  page_size: 10,
  total: 0,
  total_pages: 0,
}

/**
 * Unwraps the `{ items, meta }` payload shared by every paginated list
 * endpoint (see backend/api/pagination.go). Keeps callers from having to
 * guard against a missing `data`/`meta` on every render.
 *
 * @template T
 * @param {import('axios').AxiosResponse<{ data?: { items?: T[], meta?: object } }>} response
 * @returns {{ items: T[], meta: import('@/types/api.js').PaginationMeta }}
 */
export function unwrapPaginated(response) {
  const payload = response.data?.data
  return {
    items: payload?.items ?? [],
    meta: payload?.meta ?? { ...EMPTY_PAGINATION_META },
  }
}
