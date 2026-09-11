/**
 * User roles supported by the application.
 *
 * - buyer:    creates and submits purchase orders
 * - approver: reviews and decides (approve/reject) submitted purchase orders
 * - admin:    manages users and has full visibility/control over all purchase orders
 *
 * @typedef {'buyer' | 'approver' | 'admin'} Role
 */

/** @type {readonly Role[]} */
export const ROLES = ['buyer', 'approver', 'admin']

/** @type {Record<Role, string>} */
export const ROLE_LABELS = {
  buyer: 'Buyer',
  approver: 'Approver',
  admin: 'Admin',
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRole(value) {
  return typeof value === 'string' && ROLES.includes(value)
}
