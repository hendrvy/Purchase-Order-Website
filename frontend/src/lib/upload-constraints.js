/**
 * Shared client-side constraints for purchase order attachment uploads.
 * Keep these in sync with whatever limits the backend eventually enforces.
 */

/** Maximum size per file, in bytes (5 MB). */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Maximum number of files allowed per purchase order. */
export const MAX_FILES = 10

/** Accepted MIME type prefixes/exact matches for the file picker. */
export const ACCEPTED_MIME_TYPES = ['image/*', 'application/pdf']

/** `accept` attribute value for the native file input. */
export const FILE_INPUT_ACCEPT = 'image/*,application/pdf'

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isAcceptedFileType(file) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isAcceptedFileSize(file) {
  return file.size <= MAX_FILE_SIZE_BYTES
}

/**
 * Validates a batch of newly-picked files against an existing set,
 * returning which files are acceptable to add and any rejection reasons.
 *
 * @param {File[]} incomingFiles
 * @param {File[]} existingFiles
 * @returns {{ accepted: File[], rejected: Array<{ file: File, reason: string }> }}
 */
export function validateFiles(incomingFiles, existingFiles) {
  /** @type {File[]} */
  const accepted = []
  /** @type {Array<{ file: File, reason: string }>} */
  const rejected = []

  let totalCount = existingFiles.length

  for (const file of incomingFiles) {
    if (!isAcceptedFileType(file)) {
      rejected.push({ file, reason: 'Format file harus berupa gambar atau PDF.' })
      continue
    }

    if (!isAcceptedFileSize(file)) {
      rejected.push({ file, reason: 'Ukuran file maksimal 5 MB.' })
      continue
    }

    if (totalCount >= MAX_FILES) {
      rejected.push({ file, reason: `Maksimal ${MAX_FILES} file per purchase order.` })
      continue
    }

    accepted.push(file)
    totalCount += 1
  }

  return { accepted, rejected }
}
