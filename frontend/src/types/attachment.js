/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} po_id
 * @property {string} uploaded_by
 * @property {string} [uploaded_by_name]
 * @property {string} original_filename
 * @property {string} url - URL or path the frontend can use to view/download the file.
 * @property {string} mime_type
 * @property {number} file_size
 * @property {string} created_at
 */

/**
 * @typedef {Object} UploadAttachmentInput
 * @property {string} po_id
 * @property {File} file
 */

export {}
