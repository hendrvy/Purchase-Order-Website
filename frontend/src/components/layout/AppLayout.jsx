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
    <div className="flex min-h-dvh bg-gray-50">

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

      {/* Sidebar - always `fixed inset-y-0 left-0 h-dvh`, on every
          breakpoint, so it's pinned to the actual browser viewport
          regardless of how tall <main>'s content is (e.g. the History
          page's long table). `<main>` gets a matching `lg:ml-64` below to
          leave room for it once it's out of normal document flow.

          We previously used `lg:sticky lg:top-0` on desktop instead of
          `fixed`, which kept the sidebar in-flow as a flex item. That
          works in the simple case, but `position: sticky`'s containing
          block/scrollport can get miscomputed by some browsers once an
          ancestor (`html`/`body` in index.css) has any non-`visible`
          overflow set - which we do, for an unrelated horizontal-overflow
          guard. The symptom was the profile section at the bottom of the
          sidebar drifting upward while scrolling a long page instead of
          staying pinned to the bottom of the viewport. `position: fixed`
          has no such ambiguity - it's always relative to the viewport (as
          long as no ancestor has a transform/filter, which none do here) -
          so switching to `fixed` on all breakpoints sidesteps the bug
          entirely.

          `h-dvh` (not `h-screen`/`100vh`) matters specifically on mobile:
          `100vh` is the *largest possible* viewport height, i.e. as if the
          browser's address/toolbar were fully collapsed - even while
          they're actually visible taking up real screen space. That made
          this `fixed` sidebar taller than the space actually visible on
          screen, pushing the profile block (Nama + Role) at the bottom
          past the visible viewport - it was still there, just scrolled
          out of view (e.g. only reachable by scrolling the page, even
          though the sidebar itself has no business scrolling). `100dvh`
          ("dynamic viewport height") continuously tracks the *actual*
          visible viewport as the address bar shows/hides, so the sidebar
          - and the profile block pinned to its bottom - always exactly
          matches what's really on screen.

          The logo and profile blocks below use `flex-shrink-0` so they
          keep their natural size and never scroll; only the middle `<nav>`
          gets `overflow-y-auto` so long nav lists scroll internally on
          short viewports without dragging the logo or profile along with
          them.

          On small screens the sidebar is an off-canvas drawer that slides
          in from the left (`-translate-x-full` when closed), sitting above
          the backdrop. From `lg` up it's forced open (`lg:translate-x-0`)
          and simply stays fixed in place. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-shrink-0 flex-col bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

        {/* Logo - `flex-shrink-0` keeps it pinned at the top of the
            sidebar, never scrolling with the nav list below it. */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-6">
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

        {/* Navigation - the only scrollable region of the sidebar. */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
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

        {/* Profile - `flex-shrink-0` keeps it pinned at the bottom of the
            sidebar, never scrolling with the nav list above it. */}
        <div ref={profileRef} className="flex-shrink-0 px-4 py-4">

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
          the top bar is hidden. `lg:ml-64` makes room for the sidebar,
          which is now `fixed` (taken out of document flow) on all
          breakpoints instead of participating as a flex sibling. */}
      <main className="min-w-0 flex-1 px-4 pt-20 pb-6 sm:px-6 lg:ml-64 lg:pt-6">
        <Outlet />
      </main>

    </div>
  )
}