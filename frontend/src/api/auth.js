/**
 * @import { LoginCredentials, LoginResult } from '@/types/user.js'
 */

import { apiClient, ApiError } from '@/api/client.js'
import { MOCK_ACCOUNTS } from '@/mocks/data.js'

/**
 * Set VITE_USE_MOCKS=true in .env to develop against the mock accounts in
 * src/mocks/data.js without a running backend. Defaults to false (real
 * API) now that the frontend/backend contract is aligned (username-based
 * login, see backend/api/auth_handlers.go Login).
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS === 'true'
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
    (item) => item.username.toLowerCase() === credentials.username.toLowerCase(),
  )

  if (!account || account.password !== credentials.password) {
    throw new ApiError('Username atau password salah.', { status: 401 })
  }

  return {
    token: `mock-token.${account.user.id}.${Date.now()}`,
    user: account.user,
  }
}

/**
 * Real backend returns `{ token, company }` (see LoginResponse in
 * backend/api/models.go), so we remap `company` -> `user` here to keep the
 * rest of the frontend (AuthContext, storage, User typedef) backend-agnostic.
 *
 * @param {LoginCredentials} credentials
 * @returns {Promise<LoginResult>}
 */
export async function login(credentials) {
  if (shouldUseMocks()) {
    return mockLogin(credentials)
  }

  const response = await apiClient.post('/api/login', credentials)
  const { token, company } = response.data.data
  return { token, user: company }
}
