/**
 * Purchase order lifecycle status.
 *
 * draft        -> being prepared by the buyer, not yet submitted
 * verification -> submitted, waiting for approver review
 * processing   -> approved, being processed/fulfilled
 * shipping     -> goods are in transit
 * completed    -> fulfilled and closed successfully
 * rejected     -> declined by the approver during verification
 * cancelled    -> withdrawn/aborted at any stage before completion
 *
 * NOTE: this is the canonical status vocabulary for the frontend, matching
 * the color tokens already defined in src/index.css (--color-status-*).
 *
 * @typedef {'draft' | 'verification' | 'processing' | 'shipping' | 'completed' | 'rejected' | 'cancelled'} POStatus
 */

/** @type {readonly POStatus[]} */
export const PO_STATUSES = [
  'draft',
  'verification',
  'processing',
  'shipping',
  'completed',
  'rejected',
  'cancelled',
]

/** Statuses considered "final" - no further transitions are allowed from them. */
/** @type {readonly POStatus[]} */
export const TERMINAL_PO_STATUSES = ['completed', 'rejected', 'cancelled']

/**
 * @typedef {Object} PurchaseOrder
 * @property {string} id
 * @property {string} po_number
 * @property {string} requester_id
 * @property {string} [requester_name]
 * @property {string} title
 * @property {string} [notes]
 * @property {number} total_amount
 * @property {POStatus} status
 * @property {string} [needed_by]
 * @property {string} [submitted_at]
 * @property {string} [decided_at]
 * @property {string} [decided_by]
 * @property {string} [decision_note]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} PurchaseOrderLineItem
 * @property {string} id
 * @property {string} po_id
 * @property {string} description
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} subtotal
 */

/**
 * @typedef {Object} POStatusHistoryEntry
 * @property {string} id
 * @property {string} po_id
 * @property {POStatus | null} from_status
 * @property {POStatus} to_status
 * @property {string} actor_id
 * @property {string} [actor_name]
 * @property {string} [note]
 * @property {string} created_at
 */

/**
 * @typedef {Object} CreatePOInput
 * @property {string} title
 * @property {string} [notes]
 * @property {string} [needed_by]
 * @property {Array<Pick<PurchaseOrderLineItem, 'description' | 'quantity' | 'unit_price'>>} items
 */

/**
 * @typedef {Object} UpdatePOStatusInput
 * @property {POStatus} status
 * @property {string} [note]
 */

/**
 * @typedef {Object} POListFilters
 * @property {POStatus} [status]
 * @property {string} [requester_id]
 * @property {string} [search]
 * @property {number} [page]
 * @property {number} [page_size]
 */

/**
 * @param {POStatus} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_PO_STATUSES.includes(status)
}
