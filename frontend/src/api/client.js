import axios from 'axios'
import { getStoredToken } from '@/lib/storage.js'

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
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
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
