/**
 * @import { AuthUser } from '@/types/user.js'
 */

/**
 * localStorage keys are kept separate (token/user) per Fase 1 requirement,
 * instead of storing a single combined blob.
 */
const TOKEN_KEY = 'po_auth_token'
const USER_KEY = 'po_auth_user'

/**
 * @returns {string | null}
 */
export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * @returns {AuthUser | null}
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * @param {string} token
 * @param {AuthUser} user
 */
export function setAuthStorage(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
