import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { DashboardPage } from '@/pages/DashboardPage.jsx'
import { HistoryOrderPage } from '@/pages/HistoryOrderPage.jsx'
import { LoginPage } from '@/pages/LoginPage.jsx'
import { ProfilePage } from '@/pages/ProfilePage.jsx'
import { PurchaseOrderPage } from '@/pages/PurchaseOrderPage.jsx'
import { ActivityLogPage } from '@/pages/admin/ActivityLogPage.jsx'
import { UserManagementPage } from '@/pages/admin/UserManagementPage.jsx'
import { ProtectedRoute } from '@/routes/ProtectedRoute.jsx'
import { ADMIN_LIKE_ROLES } from '@/types/role.js'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Self-service "forgot password" was removed - password resets are
    // admin-only now (see components/admin/ResetPasswordModal.jsx). This
    // redirect just catches any stale emailed reset links still floating
    // around and sends them back to /login instead of a dead page.
    path: '/reset-password',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'history', element: <HistoryOrderPage /> },
          { path: 'profile', element: <ProfilePage /> },
          {
            // Buyers order for themselves; validator/admin order on behalf
            // of a company they pick by name (see PurchaseOrderPage).
            element: <ProtectedRoute allowedRoles={['user', 'validator', ...ADMIN_LIKE_ROLES]} />,
            children: [{ path: 'purchase-order', element: <PurchaseOrderPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ADMIN_LIKE_ROLES} />,
            children: [
              { path: 'admin/users', element: <UserManagementPage /> },
              { path: 'admin/activity-log', element: <ActivityLogPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
