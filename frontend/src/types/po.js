/**
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Purchase order lifecycle status. Matches the backend `status` column
 * exactly (backend/api/utils.go ValidatePOFields / db/schema.sql CHECK
 * constraint) - there is no draft/cancelled state on the backend today.
 *
 * verifying -> submitted, waiting for validator/admin review
 * process   -> approved, being processed/fulfilled
 * shipping  -> goods are in transit
 * complete  -> fulfilled and closed successfully
 * rejected  -> declined by the validator/admin during verification
 *
 * NOTE: this is the canonical status vocabulary for the frontend, matching
 * the color tokens already defined in src/index.css (--color-status-*).
 *
 * @typedef {'verifying' | 'process' | 'shipping' | 'complete' | 'rejected'} POStatus
 */

/** @type {readonly POStatus[]} */
export const PO_STATUSES = ['verifying', 'process', 'shipping', 'complete', 'rejected']

/** Statuses considered "final" - no further transitions are allowed from them. */
/** @type {readonly POStatus[]} */
export const TERMINAL_PO_STATUSES = ['complete', 'rejected']

/**
 * Matches the backend `PurchaseOrder` model (backend/api/models.go).
 *
 * @typedef {Object} PurchaseOrder
 * @property {number} id
 * @property {string} po_number
 * @property {number} company_id
 * @property {string} title
 * @property {number} total_amount
 * @property {string} [notes]
 * @property {string} [resi_number]
 * @property {POStatus} status
 * @property {Attachment[]} [attachments]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} CreatePOInput
 * @property {string} po_number
 * @property {string} title
 * @property {number} total_amount
 * @property {string} [notes]
 * @property {File[]} attachments - Images and/or PDFs supporting the request.
 */

/**
 * @typedef {Object} UpdatePOStatusInput
 * @property {POStatus} status
 * @property {string} [notes]
 */

/**
 * @typedef {Object} POListFilters
 * @property {POStatus} [status]
 * @property {string} [search]
 * @property {number} [page]
 * @property {number} [limit]
 */

/**
 * @param {POStatus} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_PO_STATUSES.includes(status)
}
