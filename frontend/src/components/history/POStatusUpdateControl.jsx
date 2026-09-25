import { ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getAllowedTransitions, getStatusConfig, requiresResiNumber } from '@/lib/status.js'
import { useUpdatePOStatusMutation } from '@/hooks/useUpdatePOStatusMutation.js'
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
  const containerRef = useRef(null)

  const updateStatusMutation = useUpdatePOStatusMutation()

  const allowedTargets = getAllowedTransitions(order.status, role)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setPendingTarget(null)
        setResiNumber('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

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
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1 rounded-full border border-transparent px-0.5 py-0.5 transition hover:border-gray-200"
      >
        <POStatusBadge status={order.status} />
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
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
                  className="rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
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
                  className="rounded-md px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={updateStatusMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-[#B00100] px-3 py-1 text-xs font-medium text-white hover:bg-[#B33332] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateStatusMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                  Konfirmasi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
