import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Guards nested routes: redirects to /login when not authenticated, and
 * optionally enforces a role allow-list (used from Fase 2+ for
 * approver/admin-only routes).
 *
 * @param {{ allowedRoles?: readonly Role[] }} props
 */
export function ProtectedRoute({ allowedRoles }) {
  const { user, token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Memuat...
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
