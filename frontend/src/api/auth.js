/**
 * @import { LoginCredentials, LoginResult } from '@/types/user.js'
 */

import { apiClient, ApiError } from '@/api/client.js'
import { MOCK_ACCOUNTS } from '@/mocks/data.js'

/**
 * Fase 1 is built against a mock auth layer because the real backend
 * (Go/Gin) currently expects username+company credentials and returns a
 * hardcoded token, not the email/role-based User contract documented in
 * src/types/user.js. Set VITE_USE_MOCKS=false once the backend contract
 * is aligned to switch to the real POST /api/login call below.
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS !== 'false'
}

/**
 * Simulates network latency so loading states are actually observable.
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {LoginCredentials} credentials
 * @returns {Promise<LoginResult>}
 */
async function mockLogin(credentials) {
  await delay(500)

  const account = MOCK_ACCOUNTS.find(
    (item) => item.email.toLowerCase() === credentials.email.toLowerCase(),
  )

  if (!account || account.password !== credentials.password) {
    throw new ApiError('Email atau password salah.', { status: 401 })
  }

  if (!account.user.is_active) {
    throw new ApiError('Akun Anda tidak aktif. Hubungi administrator.', { status: 403 })
  }

  return {
    token: `mock-token.${account.user.id}.${Date.now()}`,
    user: account.user,
  }
}

/**
 * @param {LoginCredentials} credentials
 * @returns {Promise<LoginResult>}
 */
export async function login(credentials) {
  if (shouldUseMocks()) {
    return mockLogin(credentials)
  }

  const response = await apiClient.post('/api/login', credentials)
  return response.data
}
