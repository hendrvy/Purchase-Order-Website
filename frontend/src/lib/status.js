/**
 * @import { POStatus } from '@/types/po.js'
 * @import { Role } from '@/types/role.js'
 */

/**
 * @typedef {Object} StatusConfigEntry
 * @property {string} label
 * @property {string} textClass - Tailwind text color class, mapped to --color-status-* tokens in index.css
 * @property {string} bgClass - Tailwind background color class, mapped to --color-status-*-bg tokens in index.css
 */

/**
 * Canonical display config for each PO status, aligned with the color
 * tokens defined in src/index.css (@theme --color-status-*).
 *
 * @type {Record<POStatus, StatusConfigEntry>}
 */
export const statusConfig = {
  verifying: {
    label: 'Verifying',
    textClass: 'text-status-verifying',
    bgClass: 'bg-status-verifying-bg',
  },
  process: {
    label: 'Processing',
    textClass: 'text-status-process',
    bgClass: 'bg-status-process-bg',
  },
  shipping: {
    label: 'Shipping',
    textClass: 'text-status-shipping',
    bgClass: 'bg-status-shipping-bg',
  },
  complete: {
    label: 'Complete',
    textClass: 'text-status-complete',
    bgClass: 'bg-status-complete-bg',
  },
  rejected: {
    label: 'Rejected',
    textClass: 'text-status-rejected',
    bgClass: 'bg-status-rejected-bg',
  },
}

/**
 * @param {POStatus} status
 * @returns {StatusConfigEntry}
 */
export function getStatusConfig(status) {
  return statusConfig[status]
}

/**
 * Which roles are allowed to move a PO from a given status to a given
 * target status. Used to drive UI (enable/disable actions) - the backend
 * remains the source of truth for enforcement (only validator/admin can
 * call PUT /api/purchase-orders/:id/status, see
 * backend/api/purchase_order_handlers.go UpdatePurchaseOrderStatus).
 *
 * @type {Record<POStatus, Partial<Record<POStatus, readonly Role[]>>>}
 */
const TRANSITION_RULES = {
  verifying: {
    process: ['validator', 'admin', 'super_admin'],
    rejected: ['validator', 'admin', 'super_admin'],
  },
  process: {
    shipping: ['validator', 'admin', 'super_admin'],
  },
  shipping: {
    complete: ['validator', 'admin', 'super_admin'],
  },
  complete: {},
  rejected: {},
}

/**
 * @param {POStatus} status
 * @param {Role} role
 * @returns {POStatus[]}
 */
export function getAllowedTransitions(status, role) {
  const transitions = TRANSITION_RULES[status] ?? {}
  return Object.keys(transitions).filter((target) =>
    transitions[target]?.includes(role),
  )
}

/**
 * @param {POStatus} status
 * @param {POStatus} target
 * @param {Role} role
 * @returns {boolean}
 */
export function canTransition(status, target, role) {
  return TRANSITION_RULES[status]?.[target]?.includes(role) ?? false
}

/**
 * Whether moving a PO to the given target status requires a resi
 * (tracking) number to be supplied. Mirrors the backend check in
 * backend/api/purchase_order_handlers.go UpdatePurchaseOrderStatus.
 *
 * @param {POStatus} targetStatus
 * @returns {boolean}
 */
export function requiresResiNumber(targetStatus) {
  return targetStatus === 'shipping'
}
