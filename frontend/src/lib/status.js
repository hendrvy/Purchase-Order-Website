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
  draft: {
    label: 'Draft',
    textClass: 'text-status-draft',
    bgClass: 'bg-status-draft-bg',
  },
  verification: {
    label: 'Verification',
    textClass: 'text-status-verification',
    bgClass: 'bg-status-verification-bg',
  },
  processing: {
    label: 'Processing',
    textClass: 'text-status-processing',
    bgClass: 'bg-status-processing-bg',
  },
  shipping: {
    label: 'Shipping',
    textClass: 'text-status-shipping',
    bgClass: 'bg-status-shipping-bg',
  },
  completed: {
    label: 'Completed',
    textClass: 'text-status-completed',
    bgClass: 'bg-status-completed-bg',
  },
  rejected: {
    label: 'Rejected',
    textClass: 'text-status-rejected',
    bgClass: 'bg-status-rejected-bg',
  },
  cancelled: {
    label: 'Cancelled',
    textClass: 'text-status-cancelled',
    bgClass: 'bg-status-cancelled-bg',
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
 * remains the source of truth for enforcement.
 *
 * @type {Record<POStatus, Partial<Record<POStatus, readonly Role[]>>>}
 */
const TRANSITION_RULES = {
  draft: {
    verification: ['buyer', 'admin'],
    cancelled: ['buyer', 'admin'],
  },
  verification: {
    processing: ['approver', 'admin'],
    rejected: ['approver', 'admin'],
    cancelled: ['buyer', 'admin'],
  },
  processing: {
    shipping: ['approver', 'admin'],
    cancelled: ['admin'],
  },
  shipping: {
    completed: ['approver', 'admin'],
  },
  completed: {},
  rejected: {},
  cancelled: {},
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
