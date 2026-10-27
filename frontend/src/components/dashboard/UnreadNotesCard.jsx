import { ChevronRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { useUnreadNotesQuery } from '@/hooks/useUnreadNotesQuery.js'
import { formatRelativeTime } from '@/lib/format.js'
import { getStatusConfig } from '@/lib/status.js'

/**
 * @import { UnreadNoteItem } from '@/types/po.js'
 */

/**
 * Preview text of the newest unread message: its text, or the new status
 * when it was a status change without a note.
 *
 * @param {UnreadNoteItem} item
 * @returns {string}
 */
function previewText(item) {
  if (item.last_message) return item.last_message
  if (item.last_status_to) return `Status diubah ke ${getStatusConfig(item.last_status_to).label}`
  return 'Pesan baru'
}

/**
 * Dashboard notification for unread messages in the PO note forum. Renders
 * nothing when everything is read. Each row opens that PO's thread in the
 * History page (which marks it as read).
 */
export function UnreadNotesCard() {
  const { user } = useAuth()
  const { data } = useUnreadNotesQuery()

  if (!data || data.total === 0) return null

  const isBuyer = user?.role === 'user'

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#B00100] text-white">
          <MessageSquare size={16} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {data.total} pesan belum dibaca
          </h2>
          <p className="text-xs text-gray-500">
            {isBuyer
              ? 'Ada catatan baru dari tim kami pada purchase order Anda.'
              : 'Ada balasan baru dari pemesan pada forum catatan.'}
          </p>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-orange-100 rounded-lg bg-white">
        {data.items.map((item) => (
          <li key={item.purchase_order_id}>
            <Link
              to={`/history?po=${item.purchase_order_id}`}
              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-orange-50"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-gray-900">
                  {item.po_number}
                  {!isBuyer && item.company_name && (
                    <span className="text-xs font-normal text-gray-500">{item.company_name}</span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-600">
                  <span className="font-medium">{item.last_author}:</span> {previewText(item)}
                </p>
                <p className="text-[11px] text-gray-400">{formatRelativeTime(item.last_at)}</p>
              </div>

              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#B00100] px-1.5 text-[11px] font-semibold text-white">
                {item.unread_count}
              </span>
              <ChevronRight size={16} className="shrink-0 text-gray-300" />
            </Link>
          </li>
        ))}
      </ul>

      {data.total > data.items.reduce((sum, item) => sum + item.unread_count, 0) && (
        <p className="mt-2 text-xs text-gray-500">
          Dan pesan lain pada purchase order lainnya. Buka satu per satu untuk melihat sisanya.
        </p>
      )}
    </div>
  )
}
