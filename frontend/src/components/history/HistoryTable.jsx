import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { formatCurrency, formatDate } from '@/lib/format.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { POStatusUpdateControl } from '@/components/history/POStatusUpdateControl.jsx'
import { AttachmentThumbnailList } from '@/components/history/AttachmentThumbnailList.jsx'
import { AttachmentPreviewModal } from '@/components/history/AttachmentPreviewModal.jsx'
import { isAdminLikeRole } from '@/types/role.js'

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Table of purchase orders for the History page, sorted by most recently
 * updated first. Includes the shipping resi number and clickable
 * thumbnails for every attachment uploaded with the order (opens a full
 * preview modal on click).
 *
 * @param {{ orders: PurchaseOrder[] }} props
 */
export function HistoryTable({ orders }) {
  const { user } = useAuth()
  /** @type {[Attachment | null, (a: Attachment | null) => void]} */
  const [previewAttachment, setPreviewAttachment] = useState(null)

  // Only validator/admin(-like) see purchase orders across every company
  // (a plain `user` only ever sees their own), so the "Perusahaan" column
  // is only useful - and only populated by the backend - for those roles.
  const showCompanyColumn = user?.role === 'validator' || isAdminLikeRole(user?.role)

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )

  // Fixed table width (see the <table> comment below for why it's a fixed
  // px value rather than `w-full`). Reused on the empty state below too -
  // otherwise the Card would shrink to fit the short "no results" message
  // whenever a filter/search produces zero rows, then jump back wide again
  // once results return, which reads exactly like "the table width keeps
  // changing" even though the table itself never resizes.
  // Must equal the exact sum of the <colgroup> widths below: No.PO(176) +
  // [Perusahaan(192) +] Judul(320) + No.Resi(160) + Total(144) +
  // Status(160) + File(192) + Diperbarui(144).
  const tableWidthClass = showCompanyColumn ? 'w-[1488px]' : 'w-[1296px]'

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        {sortedOrders.length === 0 ? (
          <div className={`${tableWidthClass} max-w-full px-5 py-6 text-center text-sm text-gray-400`}>
            Belum ada purchase order dengan status ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* table-fixed + explicit per-column widths (set once via
                <colgroup>) keep every column the same width regardless of
                cell content - without this, the default auto layout
                re-measures column widths off whatever row data happens to
                be visible (long filenames, long titles, the status
                dropdown opening, etc.), making the whole table visibly
                resize/jump as data changes.
                Deliberately NOT `w-full`: the table's width is set to the
                exact sum of its <col> widths below (see tableWidthClass
                above), so it never stretches to fill a wider container. If it did
                (e.g. w-full with only a min-width), the browser would
                redistribute any leftover space unevenly across columns
                whenever the container's available width changed slightly
                (which happens on every filter/search change, since a
                different row count can toggle the page's vertical
                scrollbar on/off) - producing the exact width "jumping"
                this is meant to prevent. */}
            <table className={`table-fixed text-left text-sm ${tableWidthClass}`}>
              <colgroup>
                <col className="w-44" />
                {showCompanyColumn && <col className="w-48" />}
                <col className="w-80" />
                <col className="w-40" />
                <col className="w-36" />
                <col className="w-40" />
                <col className="w-48" />
                <col className="w-36" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">No. PO</th>
                  {showCompanyColumn && <th className="px-5 py-3">Perusahaan</th>}
                  <th className="px-5 py-3">Judul</th>
                  <th className="px-5 py-3">No. Resi</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Diperbarui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="align-top hover:bg-gray-50">
                    {/* No. PO wraps onto a second line instead of being
                        truncated - long PO numbers used to get cut off
                        with an ellipsis at the old, narrower column width.
                        `break-words whitespace-normal` lets it fall onto a
                        second line within the same cell (the row just
                        grows taller, via `align-top` on the <tr>), same
                        pattern as Perusahaan/Judul/No. Resi/Diperbarui
                        below. Total still stays single-line/truncated
                        (formatted currency amounts are always short and
                        right-aligned, so truncating reads better than
                        wrapping). */}
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <span className="block w-full break-words whitespace-normal">
                        {order.po_number}
                      </span>
                    </td>
                    {/* Perusahaan/Judul/No. Resi/Diperbarui wrap instead of
                        truncating: `whitespace-normal break-words` lets
                        long values fall onto a second line within the
                        same cell (the row just grows taller, via
                        `align-top` on the <tr>) rather than being cut off
                        with an ellipsis. No `min-w-0`/`overflow-hidden`
                        needed here since wrapped text never exceeds the
                        column's width in the first place. */}
                    {showCompanyColumn && (
                      <td className="px-5 py-3 text-gray-700">
                        <span className="block w-full break-words whitespace-normal">
                          {order.company?.company_name || (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-gray-700">
                      <span className="block w-full break-words whitespace-normal">
                        {order.title}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <span className="block w-full break-words whitespace-normal">
                        {order.resi_number || <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="overflow-hidden px-5 py-3 text-right text-gray-900">
                      <span className="block w-full min-w-0 truncate">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td className="overflow-hidden px-5 py-3">
                      <POStatusUpdateControl order={order} role={user?.role} />
                    </td>
                    <td className="overflow-hidden px-5 py-3">
                      <AttachmentThumbnailList
                        attachments={order.attachments}
                        onPreview={setPreviewAttachment}
                      />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      <span className="block w-full break-words whitespace-normal">
                        {formatDate(order.updated_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </Card>
  )
}
