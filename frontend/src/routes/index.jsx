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
            // Only the "user" role submits purchase orders - validator/
            // admin only review/manage them via History, so this route
            // (and its nav item) is off-limits to those roles.
            element: <ProtectedRoute allowedRoles={['user']} />,
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
