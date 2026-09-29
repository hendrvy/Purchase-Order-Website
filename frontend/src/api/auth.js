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

/**
 * Mock forgot-password: always "succeeds" after a delay, mirroring the
 * real backend's generic response (see ForgotPassword in
 * backend/api/forgot_password_handlers.go) which never reveals whether
 * the email is actually registered, to avoid email enumeration.
 *
 * @param {string} _email
 * @returns {Promise<{ message: string }>}
 */
async function mockForgotPassword(_email) {
  await delay(500)
  return { message: 'Jika email terdaftar, kami telah mengirimkan link reset password.' }
}

/**
 * Requests a password reset email. Always resolves with a generic
 * success message regardless of whether the email is registered (see
 * ForgotPassword in backend/api/forgot_password_handlers.go) - the UI
 * should never imply whether a given email exists in the system.
 *
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export async function forgotPassword(email) {
  if (shouldUseMocks()) {
    return mockForgotPassword(email)
  }

  const response = await apiClient.post('/api/forgot-password', { email })
  return response.data
}

/**
 * Mock reset-password: accepts any non-empty token, mirroring the shape
 * of the real endpoint's success/failure without needing a real emailed
 * token in mock mode.
 *
 * @param {{ token: string, newPassword: string }} input
 * @returns {Promise<{ message: string }>}
 */
async function mockResetPassword({ token }) {
  await delay(500)

  if (!token) {
    throw new ApiError('Link reset password tidak valid atau sudah kedaluwarsa.', { status: 400 })
  }

  return { message: 'Password berhasil direset. Silakan login dengan password baru Anda.' }
}

/**
 * Completes the forgot-password flow: submits the token from the emailed
 * link plus a new password. See ResetPassword in
 * backend/api/forgot_password_handlers.go.
 *
 * @param {{ token: string, newPassword: string }} input
 * @returns {Promise<{ message: string }>}
 */
export async function resetPassword(input) {
  if (shouldUseMocks()) {
    return mockResetPassword(input)
  }

  const response = await apiClient.post('/api/reset-password', {
    token: input.token,
    new_password: input.newPassword,
  })
  return response.data
}
