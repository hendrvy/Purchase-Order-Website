/**
 * Matches the backend `Attachment` model (backend/api/models.go). A
 * purchase order can have many attachments (many-to-many via the
 * `purchase_order_attachments` join table), so this shape has no `po_id` -
 * attachments are only ever seen nested inside a `PurchaseOrder.attachments`
 * array or as the response of a standalone upload.
 *
 * @typedef {Object} Attachment
 * @property {number} id
 * @property {string} filename
 * @property {string} filepath
 * @property {string} mime_type
 * @property {string} created_at
 */

export {}
