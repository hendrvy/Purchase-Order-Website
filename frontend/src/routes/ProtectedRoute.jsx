import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Guards nested routes: redirects to /login when not authenticated, and
 * optionally enforces a role allow-list (used for validator/admin-only
 * routes).
 *
 * Note: intentionally does NOT pass the current location via
 * `state.from` - after logging in, the user always lands on /dashboard
 * rather than being sent back to whatever protected page they originally
 * tried to visit (see LoginPage.jsx).
 *
 * @param {{ allowedRoles?: readonly Role[] }} props
 */
export function ProtectedRoute({ allowedRoles }) {
  const { user, token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Memuat...
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
