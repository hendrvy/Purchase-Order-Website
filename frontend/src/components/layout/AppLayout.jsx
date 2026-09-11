import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS } from '@/types/role.js'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/purchase-order', label: 'Purchase Order' },
  { to: '/history', label: 'History' },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {user?.full_name}{' '}
              <span className="text-xs text-gray-400">({ROLE_LABELS[user?.role]})</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
