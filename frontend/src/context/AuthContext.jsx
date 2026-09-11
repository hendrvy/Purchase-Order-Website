import { createContext, use, useCallback, useState } from 'react'
import { login as loginRequest } from '@/api/auth.js'
import { clearAuthStorage, getStoredToken, getStoredUser, setAuthStorage } from '@/lib/storage.js'

/**
 * @import { LoginCredentials, LoginResult, AuthUser } from '@/types/user.js'
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {AuthUser | null} user
 * @property {string | null} token
 * @property {boolean} isLoading - true while restoring session from localStorage on mount.
 * @property {(credentials: LoginCredentials) => Promise<LoginResult>} login
 * @property {() => void} logout
 */

/** @type {import('react').Context<AuthContextValue | undefined>} */
const AuthContext = createContext(undefined)

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  // Restore session from localStorage synchronously on first render (lazy
  // initializer) so a page refresh keeps the user logged in without an
  // extra render/effect cycle.
  const [user, setUser] = useState(() => getStoredUser())
  const [token, setToken] = useState(() => getStoredToken())
  // Restoration above is synchronous, so there is never an actual loading
  // window today - kept as `false` (not state) so ProtectedRoute's
  // isLoading branch stays ready for a future async restore (e.g. token
  // verification against the backend) without changing its contract.
  const isLoading = false

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials)
    setAuthStorage(result.token, result.user)
    setToken(result.token)
    setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    clearAuthStorage()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext>
  )
}

/**
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const context = use(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
