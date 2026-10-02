import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { SortControl } from '@/components/ui/SortControl.jsx'
import { formatCurrency, formatDate } from '@/lib/format.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { useDeletePOMutation } from '@/hooks/useDeletePOMutation.js'
import { POStatusUpdateControl } from '@/components/history/POStatusUpdateControl.jsx'
import { AttachmentThumbnailList } from '@/components/history/AttachmentThumbnailList.jsx'
import { AttachmentPreviewModal } from '@/components/history/AttachmentPreviewModal.jsx'
import { isAdminLikeRole } from '@/types/role.js'

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Tanggal Diperbarui' },
  { value: 'company', label: 'Perusahaan' },
]

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Table of purchase orders for the History page. Filtering, sorting, and
 * pagination all happen server-side (see HistoryOrderPage.jsx); this
 * component is presentational - it renders the current page's `orders` and
 * forwards the sort/page controls back up. Includes the shipping resi
 * number and clickable thumbnails for every attachment uploaded with the
 * order (opens a full preview modal on click).
 *
 * @param {{
 *   orders: PurchaseOrder[],
 *   meta: import('@/types/api.js').PaginationMeta,
 *   sort: string,
 *   order: 'asc' | 'desc',
 *   onSortChange: (field: string) => void,
 *   onToggleOrder: () => void,
 *   onPageChange: (page: number) => void,
 * }} props
 */
export function HistoryTable({
  orders,
  meta,
  sort,
  order,
  onSortChange,
  onToggleOrder,
  onPageChange,
}) {
  const { user } = useAuth()
  /** @type {[Attachment | null, (a: Attachment | null) => void]} */
  const [previewAttachment, setPreviewAttachment] = useState(null)
  /** @type {[PurchaseOrder | null, (o: PurchaseOrder | null) => void]} */
  const [pendingDelete, setPendingDelete] = useState(null)
  const deleteMutation = useDeletePOMutation()

  // Only validator/admin(-like) see purchase orders across every company
  // (a plain `user` only ever sees their own), so the "Perusahaan" column
  // is only useful - and only populated by the backend - for those roles.
  const showCompanyColumn = user?.role === 'validator' || isAdminLikeRole(user?.role)

  // A `user` can only cancel their own PO while it's still 'verifying' -
  // once a validator/admin has started processing it, the user can no
  // longer delete it (mirrors the backend check in
  // backend/api/purchase_order_handlers.go DeletePurchaseOrder, which is
  // the actual source of truth/enforcement; this just hides the button
  // for cases we already know would be rejected).
  function canCancel(order) {
    return user?.role === 'user' && order.company_id === user?.id && order.status === 'verifying'
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return

    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(`PO ${pendingDelete.po_number} berhasil dibatalkan.`)
        setPendingDelete(null)
      },
      onError: (error) => {
        toast.error(error?.message ?? 'Gagal membatalkan purchase order.')
      },
    })
  }

  return (
    <>
      {meta.total > 0 && (
        <Card className="py-0">
          <CardContent className="px-0">
            <Pagination
              page={meta.page}
              pageCount={meta.total_pages}
              totalItems={meta.total}
              pageSize={meta.page_size}
              onPageChange={onPageChange}
              className="border-t-0"
              sortControl={
                <SortControl
                  value={sort}
                  onChange={onSortChange}
                  direction={order}
                  onToggleDirection={onToggleOrder}
                  options={SORT_OPTIONS}
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Mobile/tablet card list (< lg): below `lg` there isn't enough
          width for 7-8 fluid table columns to stay readable (see the
          <table> comment below - it's `w-full` with percentage-based
          columns, so it never overflows, but on narrower screens those
          percentages shrink to the point of wrapping every cell onto
          multiple lines and feeling cramped). Replaced entirely by a
          stacked list of cards - one per order - instead. Hidden from
          `lg` up via `lg:hidden`. */}
      <div className="flex flex-col gap-3 lg:hidden">
          {orders.length === 0 ? (
          <Card>
            <CardContent className="px-5 py-6 text-center text-sm text-gray-400">
              Belum ada purchase order dengan status ini.
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="py-0">
              <CardContent className="flex flex-col gap-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{order.po_number}</p>
                    <p className="mt-0.5 break-words text-sm text-gray-700">{order.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <POStatusUpdateControl order={order} role={user?.role} />
                    {canCancel(order) && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(order)}
                        aria-label={`Batalkan PO ${order.po_number}`}
                        className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {showCompanyColumn && (
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-gray-400">Perusahaan</span>
                    <span className="text-right text-gray-700">
                      {order.company?.company_name || '-'}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-gray-400">No. Resi</span>
                  <span className="text-right text-gray-700">{order.resi_number || '-'}</span>
                </div>

                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-gray-400">Total</span>
                  <span className="text-right font-medium text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-gray-400">Diperbarui</span>
                  <span className="text-right text-gray-500">{formatDate(order.updated_at)}</span>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <p className="mb-1.5 text-xs text-gray-400">File</p>
                  <AttachmentThumbnailList
                    attachments={order.attachments}
                    onPreview={setPreviewAttachment}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table (>= lg). */}
      <Card className="hidden py-0 lg:block">
        <CardContent className="px-0">
        {orders.length === 0 ? (
            <div className="w-full px-5 py-6 text-center text-sm text-gray-400">
              Belum ada purchase order dengan status ini.
            </div>
          ) : (
            <>
              {/* table-fixed + explicit per-column widths (set once via
                  <colgroup>, as percentages that sum to 100%) keep every
                  column a stable *proportion* of the table regardless of
                  cell content - without `table-fixed`, the default auto
                  layout re-measures column widths off whatever row data
                  happens to be visible (long filenames, long titles, the
                  status dropdown opening, etc.), making the whole table
                  visibly resize/jump as data changes.
                  `w-full` (rather than a fixed px sum) means the table
                  always exactly fills its container - it can never be
                  wider than the viewport, so there's no horizontal
                  scrollbar to fight with on narrower `lg`/`xl` screens.
                  Percentages (not `w-full`+`min-width` per <col>) are what
                  keep column proportions identical at every width instead
                  of the browser redistributing leftover space unevenly
                  whenever the container's available width changes slightly
                  (e.g. a filter/search toggling the page's vertical
                  scrollbar on/off) - that uneven redistribution is what
                  reads as the table "jumping". */}
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className={showCompanyColumn ? 'w-[11%]' : 'w-[12.5%]'} />
                  {showCompanyColumn && <col className="w-[12%]" />}
                  <col className={showCompanyColumn ? 'w-[20%]' : 'w-[23.5%]'} />
                  <col className={showCompanyColumn ? 'w-[10%]' : 'w-[11.5%]'} />
                  <col className={showCompanyColumn ? 'w-[9%]' : 'w-[10%]'} />
                  <col className={showCompanyColumn ? 'w-[10%]' : 'w-[11.5%]'} />
                  <col className={showCompanyColumn ? 'w-[12%]' : 'w-[14%]'} />
                  <col className={showCompanyColumn ? 'w-[9%]' : 'w-[10%]'} />
                  <col className="w-[7%]" />
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
                    <th className="px-5 py-3" aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
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
                        <span
                          className="block w-full min-w-0 truncate"
                          title={formatCurrency(order.total_amount)}
                        >
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
                      <td className="px-5 py-3 text-center">
                        {canCancel(order) && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(order)}
                            aria-label={`Batalkan PO ${order.po_number}`}
                            className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      {pendingDelete && (
        <ConfirmDialog
          title="Batalkan Purchase Order"
          description={
            <>
              Batalkan PO{' '}
              <span className="font-medium text-gray-900">{pendingDelete.po_number}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </>
          }
          confirmLabel="Batalkan PO"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
