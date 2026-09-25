/**
 * User roles supported by the application. Matches the backend `Roles`
 * enum exactly (backend/api/models.go).
 *
 * - user:      creates and submits purchase orders for their own company
 * - validator: reviews purchase orders and updates their status; can see
 *              purchase orders across all companies
 * - admin:     full visibility/control over all purchase orders and companies
 *
 * @typedef {'user' | 'validator' | 'admin'} Role
 */

/** @type {readonly Role[]} */
export const ROLES = ['user', 'validator', 'admin']

/** @type {Record<Role, string>} */
export const ROLE_LABELS = {
  user: 'User',
  validator: 'Validator',
  admin: 'Admin',
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRole(value) {
  return typeof value === 'string' && ROLES.includes(value)
}
