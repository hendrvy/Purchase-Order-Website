import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { formatCurrency, formatDate } from '@/lib/format.js'
import { POStatusBadge } from '@/components/history/POStatusBadge.jsx'
import { AttachmentThumbnailList } from '@/components/history/AttachmentThumbnailList.jsx'
import { AttachmentPreviewModal } from '@/components/history/AttachmentPreviewModal.jsx'

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
  /** @type {[Attachment | null, (a: Attachment | null) => void]} */
  const [previewAttachment, setPreviewAttachment] = useState(null)

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        {sortedOrders.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-400">
            Belum ada purchase order dengan status ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">No. PO</th>
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
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {order.po_number}
                    </td>
                    <td className="max-w-[220px] px-5 py-3 text-gray-700">
                      <p className="truncate" title={order.title}>
                        {order.title}
                      </p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                      {order.resi_number || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <POStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3">
                      <AttachmentThumbnailList
                        attachments={order.attachments}
                        onPreview={setPreviewAttachment}
                      />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                      {formatDate(order.updated_at)}
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
