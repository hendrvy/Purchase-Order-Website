/**
 * User roles supported by the application. Matches the backend `Roles`
 * enum exactly (backend/api/models.go).
 *
 * - user:        creates and submits purchase orders for their own company
 * - validator:   reviews purchase orders and updates their status; can see
 *                purchase orders across all companies
 * - admin:       full visibility/control over all purchase orders and
 *                companies
 * - super_admin: same access as admin, but its role/password can never be
 *                changed by anyone via the app (see backend RoleSuperAdmin).
 *                Can only be granted via direct database access - never
 *                shown as an assignable option in any UI (see
 *                ASSIGNABLE_ROLES below).
 *
 * @typedef {'user' | 'validator' | 'admin' | 'super_admin'} Role
 */

/** @type {readonly Role[]} */
export const ROLES = ['user', 'validator', 'admin', 'super_admin']

/**
 * Roles that can actually be assigned to an account through the UI
 * (create-account form, role dropdown). Excludes `super_admin`, which can
 * only ever be granted via a direct database update - see
 * backend/api/admin_handlers.go AdminCreateCompany/AdminUpdateCompanyRole,
 * which reject it outright even if sent explicitly.
 *
 * @type {readonly Role[]}
 */
export const ASSIGNABLE_ROLES = ['user', 'validator', 'admin']

/** @type {Record<Role, string>} */
export const ROLE_LABELS = {
  user: 'User',
  validator: 'Validator',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

/**
 * Roles that get full admin-level access to the app (nav items, admin
 * routes, dashboard user summary, etc). Mirrors the backend's
 * RequireAdmin middleware, which allows both admin and super_admin.
 *
 * @type {readonly Role[]}
 */
export const ADMIN_LIKE_ROLES = ['admin', 'super_admin']

/**
 * @param {unknown} role
 * @returns {boolean}
 */
export function isAdminLikeRole(role) {
  return ADMIN_LIKE_ROLES.includes(role)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRole(value) {
  return typeof value === 'string' && ROLES.includes(value)
}
