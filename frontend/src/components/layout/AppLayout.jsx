import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, LogOut, Menu, User, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS, isAdminLikeRole } from '@/types/role.js'
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
  const location = useLocation()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const profileRef = useRef(null)

  const navItems = [
    DASHBOARD_NAV_ITEM,
    ...(user?.role === 'user' ? [PURCHASE_ORDER_NAV_ITEM] : []),
    HISTORY_NAV_ITEM,
    ...(isAdminLikeRole(user?.role) ? ADMIN_NAV_ITEMS : []),
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

  // Close the mobile sidebar drawer automatically whenever the route
  // changes (e.g. after tapping a nav link), so users don't have to
  // manually dismiss it after navigating.
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Mobile top bar - only visible below the `lg` breakpoint. Gives
          mobile users a hamburger button to open the off-canvas sidebar,
          since the sidebar itself is hidden by default on small screens. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Buka menu"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="SMS Order" className="h-8 w-auto" />
          <span className="text-base font-bold text-[#B00100]">SMS Order</span>
        </Link>
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Backdrop - dims and blocks the page behind the drawer on mobile.
          Clicking it closes the sidebar, same as tapping outside a modal. */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - `sticky top-0 h-screen` keeps it pinned to the viewport
          with its own fixed height, independent of how tall <main>'s
          content is. Without this, the sidebar (a flex item) stretches to
          match the height of the tallest sibling (main), so on long pages
          the whole <aside> - including the `mt-auto` profile section at
          its bottom - grows taller and the profile dropdown ends up
          rendered far down the page instead of staying anchored near the
          bottom of the visible screen. `overflow-y-auto` lets the nav
          links scroll internally on short viewports instead of pushing
          the profile section off-screen.

          On small screens the sidebar becomes a fixed off-canvas drawer
          that slides in from the left (`-translate-x-full` when closed),
          sitting above the backdrop. From `lg` up it reverts to the
          normal sticky in-flow sidebar. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6">
          <Link to="/dashboard" className="block flex-1 text-center">
            <img src={logo} alt="SMS Order" className="mx-auto h-10 w-auto" />
            <h1 className="text-xl font-bold text-[#B00100]">
              SMS Order
            </h1>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Tutup menu"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
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

      {/* Main Content - `pt-20` on mobile clears the fixed top bar (h-14)
          plus breathing room; `lg:pt-6` restores the normal padding once
          the top bar is hidden and the sidebar is back in-flow. */}
      <main className="min-w-0 flex-1 px-4 pt-20 pb-6 sm:px-6 lg:pt-6">
        <Outlet />
      </main>

    </div>
  )
}