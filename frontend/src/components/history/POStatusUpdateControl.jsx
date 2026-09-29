import { ChevronDown, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { getAllowedTransitions, getStatusConfig, requiresResiNumber } from '@/lib/status.js'
import { useUpdatePOStatusMutation } from '@/hooks/useUpdatePOStatusMutation.js'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition.js'
import { useClickOutside } from '@/hooks/useClickOutside.js'
import { POStatusBadge } from '@/components/history/POStatusBadge.jsx'

/**
 * @import { PurchaseOrder, POStatus } from '@/types/po.js'
 * @import { Role } from '@/types/role.js'
 */

/**
 * Status cell for the History table. For roles/statuses with no allowed
 * transition (e.g. a `user`, or a terminal PO), renders a plain read-only
 * badge. For validator/admin on a PO that still has allowed transitions
 * (see lib/status.js getAllowedTransitions), renders the badge plus a
 * small dropdown of next-status actions. Moving to `shipping` requires a
 * resi (tracking) number, enforced both here and on the backend (see
 * backend/api/purchase_order_handlers.go UpdatePurchaseOrderStatus).
 *
 * @param {{ order: PurchaseOrder, role: Role }} props
 */
export function POStatusUpdateControl({ order, role }) {
  const [isOpen, setIsOpen] = useState(false)
  /** @type {[POStatus | null, (v: POStatus | null) => void]} */
  const [pendingTarget, setPendingTarget] = useState(null)
  const [resiNumber, setResiNumber] = useState('')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const updateStatusMutation = useUpdatePOStatusMutation()

  const allowedTargets = getAllowedTransitions(order.status, role)

  function closeMenu() {
    setIsOpen(false)
    setPendingTarget(null)
    setResiNumber('')
  }

  useClickOutside(isOpen, [triggerRef, menuRef], closeMenu)

  // The dropdown panel is rendered through a portal into document.body (see
  // the render below) so it can never be clipped by an ancestor's
  // `overflow-hidden`/`overflow-x-auto` (the table wrapper, the Card, and
  // the status <td> itself all clip overflow - see HistoryTable.jsx).
  // useAnchoredPosition computes its on-screen position from the trigger
  // button's rect, since it's no longer a DOM descendant of it. Passing
  // the panel's width (`w-56` below = 224px) lets it clamp `left` to stay
  // fully inside the viewport - without this, a trigger near the right
  // edge (common on mobile, where the status control sits at the right
  // edge of a narrow card - see HistoryTable's mobile card view) would
  // render the panel partly off-screen, widening the page's scrollable
  // area and causing the whole layout to visibly shift on some mobile
  // browsers.
  const menuPosition = useAnchoredPosition(isOpen, triggerRef, 224)

  if (allowedTargets.length === 0) {
    return <POStatusBadge status={order.status} />
  }

  const needsResi = pendingTarget ? requiresResiNumber(pendingTarget) : false

  function handlePickTarget(target) {
    setPendingTarget(target)
    setResiNumber('')
  }

  function handleCancel() {
    setPendingTarget(null)
    setResiNumber('')
  }

  function handleConfirm() {
    if (!pendingTarget) return

    if (needsResi && !resiNumber.trim()) {
      toast.error('No. Resi wajib diisi untuk status Shipping.')
      return
    }

    updateStatusMutation.mutate(
      {
        id: order.id,
        status: pendingTarget,
        ...(needsResi ? { resi_number: resiNumber.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Status PO ${order.po_number} diperbarui ke ${getStatusConfig(pendingTarget).label}.`)
          setIsOpen(false)
          setPendingTarget(null)
          setResiNumber('')
        },
        onError: (error) => {
          toast.error(error?.message ?? 'Gagal memperbarui status.')
        },
      },
    )
  }

  return (
    <div className="relative inline-block">
      {/* Always-visible border + background (not just on `:hover`, which
          doesn't exist on touch devices and left this control looking
          like a plain read-only badge on mobile with no indication it's
          tappable) gives this a clear "button" affordance at rest.
          `active:` provides the actual tap feedback on touch devices. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1 rounded-full border border-gray-300 bg-white py-0.5 pr-1.5 pl-0.5 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100"
      >
        <POStatusBadge status={order.status} />
        <ChevronDown size={14} className="text-gray-500" />
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'absolute', top: menuPosition.top, left: menuPosition.left }}
            className="z-50 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          >
            {!pendingTarget ? (
              <div className="flex flex-col gap-1">
                <p className="px-1 pb-1 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Ubah status ke
                </p>
                {allowedTargets.map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => handlePickTarget(target)}
                    className="rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-100 active:bg-gray-200"
                  >
                    {getStatusConfig(target).label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-1">
                <p className="text-xs text-gray-600">
                  Ubah status ke{' '}
                  <span className="font-medium text-gray-900">
                    {getStatusConfig(pendingTarget).label}
                  </span>
                  ?
                </p>

                {needsResi && (
                  <input
                    type="text"
                    autoFocus
                    value={resiNumber}
                    onChange={(event) => setResiNumber(event.target.value)}
                    placeholder="No. Resi"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
                  />
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-md px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-1 rounded-md bg-[#B00100] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#B33332] active:bg-[#8f0100] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    Konfirmasi
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
