/**
 * Generic success envelope returned by the API.
 *
 * @template T
 * @typedef {Object} ApiSuccess
 * @property {number} status
 * @property {string} message
 * @property {T} data
 */

/**
 * Generic error envelope returned by the API.
 *
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {string} message
 * @property {string} [error]
 * @property {Record<string, string>} [errors] - Field-level validation errors, e.g. { email: "is required" }.
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} page_size
 * @property {number} total
 * @property {number} total_pages
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} items
 * @property {PaginationMeta} meta
 */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isApiError(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  )
}
