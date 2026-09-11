/**
 * Formats a number as Indonesian Rupiah, e.g. 1500000 -> "Rp1.500.000".
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats an ISO date/datetime string as "10 Sep 2026".
 *
 * @param {string | Date} value
 * @returns {string}
 */
export function formatDate(value) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * Formats an ISO date/datetime string as "10 Sep 2026, 14:30".
 *
 * @param {string | Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Formats an ISO date/datetime string as a human-friendly relative time, e.g. "3 hours ago".
 *
 * @param {string | Date} value
 * @returns {string}
 */
export function formatRelativeTime(value) {
  const date = typeof value === 'string' ? new Date(value) : value
  const diffMs = date.getTime() - Date.now()
  const diffSeconds = Math.round(diffMs / 1000)

  /** @type {Array<[Intl.RelativeTimeFormatUnit, number]>} */
  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
      const amount = Math.round(diffSeconds / secondsInUnit)
      return rtf.format(amount, unit)
    }
  }

  return rtf.format(0, 'second')
}

/**
 * Formats a byte count as a human-readable size, e.g. 1536 -> "1.5 KB".
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent

  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}
