import { Bell, Inbox } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClickOutside } from '@/hooks/useClickOutside.js'
import { useUnreadNotesQuery } from '@/hooks/useUnreadNotesQuery.js'
import { formatRelativeTime } from '@/lib/format.js'
import { unreadPreviewText } from '@/lib/notes.js'

/**
 * Buyer inbox: a bell with an unread badge that opens an overlay panel
 * listing the POs with unread staff notes. Each row opens that PO's thread
 * in the History page (which marks it as read).
 *
 * `panelClassName` positions the panel (it is `position: fixed`, so it
 * overlays the page regardless of where the bell is rendered).
 *
 * @param {{ className?: string, panelClassName?: string }} props
 */
export function NoteInbox({ className = '', panelClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const { data } = useUnreadNotesQuery()

  useClickOutside(isOpen, [rootRef], () => setIsOpen(false))

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const total = data?.total ?? 0
  const items = data?.items ?? []

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={total > 0 ? `Inbox, ${total} pesan belum dibaca` : 'Inbox'}
        aria-expanded={isOpen}
        className="relative rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-black"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B00100] px-1 text-[10px] font-semibold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Inbox pesan"
          className={`fixed z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${panelClassName}`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Inbox</h2>
            <span className="text-xs text-gray-500">
              {total > 0 ? `${total} belum dibaca` : 'Semua sudah dibaca'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-gray-400">
              <Inbox size={28} />
              <p className="text-sm">Tidak ada pesan baru.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.purchase_order_id}>
                  <Link
                    to={`/history?po=${item.purchase_order_id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.po_number}</p>
                      <p className="line-clamp-2 text-xs break-words text-gray-600">
                        <span className="font-medium">{item.last_author}:</span>{' '}
                        {unreadPreviewText(item)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {formatRelativeTime(item.last_at)}
                      </p>
                    </div>
                    <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#B00100] px-1.5 text-[11px] font-semibold text-white">
                      {item.unread_count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
