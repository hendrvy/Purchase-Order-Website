import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { DashboardPage } from '@/pages/DashboardPage.jsx'
import { HistoryOrderPage } from '@/pages/HistoryOrderPage.jsx'
import { LoginPage } from '@/pages/LoginPage.jsx'
import { PurchaseOrderPage } from '@/pages/PurchaseOrderPage.jsx'
import { ProtectedRoute } from '@/routes/ProtectedRoute.jsx'

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
          { path: 'purchase-order', element: <PurchaseOrderPage /> },
          { path: 'history', element: <HistoryOrderPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
