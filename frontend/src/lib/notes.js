import { getStatusConfig } from '@/lib/status.js'

/**
 * @import { UnreadNoteItem } from '@/types/po.js'
 */

/**
 * Preview text of the newest unread message of a PO: its text, or the new
 * status when it was a status change without a note.
 *
 * @param {UnreadNoteItem} item
 * @returns {string}
 */
export function unreadPreviewText(item) {
  if (item.last_message) return item.last_message
  if (item.last_status_to) return `Status diubah ke ${getStatusConfig(item.last_status_to).label}`
  return 'Pesan baru'
}
