import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS } from '@/types/role.js'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar.jsx'
import logo from '@/assets/logo.png'

const DASHBOARD_NAV_ITEM = { to: '/dashboard', label: 'Dashboard' }
const HISTORY_NAV_ITEM = { to: '/history', label: 'History' }

// Only the "user" role submits purchase orders - validator/admin only
// review/manage them via the History table, so they have no need for the
// create-PO form/nav item.
const PURCHASE_ORDER_NAV_ITEM = { to: '/purchase-order', label: 'Purchase Order' }

const ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: 'Kelola User' },
  { to: '/admin/activity-log', label: 'Log Aktivitas' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const navItems = [
    DASHBOARD_NAV_ITEM,
    ...(user?.role === 'user' ? [PURCHASE_ORDER_NAV_ITEM] : []),
    HISTORY_NAV_ITEM,
    ...(user?.role === 'admin' ? ADMIN_NAV_ITEMS : []),
  ]

  // Close the profile dropdown when clicking anywhere outside of it.
  useEffect(() => {
    if (!isProfileOpen) return

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileOpen])

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-white">

        {/* Logo */}
        <div className="px-6 py-6 text-center">
          <img src={logo} alt="SMS Order" className="mx-auto h-10 w-auto" />
          <h1 className="text-xl font-bold text-[#B00100]">
            SMS Order
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `border-l-2 px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-[#B00100] bg-gray-100 text-black'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-black'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div ref={profileRef} className="mt-auto px-4 py-4">

          {/* Dropdown */}
          {isProfileOpen && (
            <div className="mb-2 rounded-lg border border-gray-300 bg-white p-1 shadow-md">

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false)
                  navigate('/profile')
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                <User size={17} />
                Edit Profile
              </button>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={17} />
                Logout
              </button>

            </div>
          )}

          {/* Profile Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-gray-100"
          >

            {/* Avatar */}
            <ProfileAvatar user={user} size={36} />

            {/* User Info */}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.company_name}
              </p>

              <p className="text-xs text-gray-500">
                {ROLE_LABELS[user?.role]}
              </p>
            </div>

            {/* Arrow */}
            {isProfileOpen ? (
              <ChevronDown size={18} className="text-gray-500" />
            ) : (
              <ChevronUp size={18} className="text-gray-500" />
            )}

          </button>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>

    </div>
  )
}