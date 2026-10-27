/**
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Purchase order lifecycle status. Matches the backend `status` column
 * exactly (backend/api/utils.go ValidatePOFields / db/schema.sql CHECK
 * constraint) - there is no draft/cancelled state on the backend today.
 *
 * submitted -> newly created by the buyer, waiting for validator/admin
 * verifying -> being verified by the validator/admin
 * process   -> approved, being processed/fulfilled
 * shipping  -> goods are in transit
 * complete  -> fulfilled and closed successfully
 * rejected  -> declined by the validator/admin during verification
 *
 * NOTE: this is the canonical status vocabulary for the frontend, matching
 * the color tokens already defined in src/index.css (--color-status-*).
 *
 * @typedef {'submitted' | 'verifying' | 'process' | 'shipping' | 'complete' | 'rejected'} POStatus
 */

/** @type {readonly POStatus[]} */
export const PO_STATUSES = ['submitted', 'verifying', 'process', 'shipping', 'complete', 'rejected']

/**
 * One entry of a PO's note thread (backend `PONote`). Top-level entries
 * (parent_id == null) are written by validator/admin on a status change;
 * replies are written by the buyer (or staff). A note written on
 * shipping -> complete carries the proof photo.
 *
 * @typedef {Object} PONote
 * @property {number} id
 * @property {number} purchase_order_id
 * @property {number | null} parent_id
 * @property {number} company_id
 * @property {{ id: number, company_name: string, username: string, role: string } | null} [author]
 * @property {string} author_role
 * @property {string} message
 * @property {POStatus} [status_from]
 * @property {POStatus} [status_to]
 * @property {'resi' | 'pickup'} [proof_type]
 * @property {number} [attachment_id]
 * @property {Attachment} [attachment]
 * @property {string} created_at
 */

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
 * @property {{ id: number, company_name: string, username: string } | null} [company] - The requesting company, preloaded server-side (see GetAllPurchaseOrdersDB/GetPurchaseOrderByIDDB) so validator/admin tables can show who submitted the PO without a second lookup.
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
