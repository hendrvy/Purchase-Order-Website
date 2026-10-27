import { ChevronDown, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  PROOF_TYPE_LABELS,
  getAllowedTransitions,
  getStatusConfig,
  requiresProof,
} from '@/lib/status.js'
import { useUpdatePOStatusMutation } from '@/hooks/useUpdatePOStatusMutation.js'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition.js'
import { useClickOutside } from '@/hooks/useClickOutside.js'
import { POStatusBadge } from '@/components/history/POStatusBadge.jsx'

/**
 * @import { PurchaseOrder, POStatus } from '@/types/po.js'
 * @import { Role } from '@/types/role.js'
 */

const MAX_NOTE_LENGTH = 1000
const MAX_PROOF_SIZE = 5 * 1024 * 1024
const PROOF_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const PROOF_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

/**
 * Modal form shown after picking a target status: an optional note for the
 * PO's thread and, for shipping -> complete, a required proof photo (either
 * the issued resi or proof of pickup from the warehouse).
 *
 * @param {{
 *   order: PurchaseOrder,
 *   target: POStatus,
 *   isPending: boolean,
 *   onCancel: () => void,
 *   onSubmit: (input: { message: string, proof_type?: 'resi' | 'pickup', proof?: File }) => void,
 * }} props
 */
function StatusChangeDialog({ order, target, isPending, onCancel, onSubmit }) {
  const [message, setMessage] = useState('')
  const [proofType, setProofType] = useState('resi')
  const [proofFile, setProofFile] = useState(null)
  const needsProof = requiresProof(target)

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setProofFile(null)
      return
    }

    const lowerName = file.name.toLowerCase()
    if (!PROOF_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      toast.error('Bukti harus berupa foto (JPG, PNG, atau WEBP).')
      event.target.value = ''
      setProofFile(null)
      return
    }
    if (file.size > MAX_PROOF_SIZE) {
      toast.error('Ukuran foto maksimal 5MB.')
      event.target.value = ''
      setProofFile(null)
      return
    }
    setProofFile(file)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (needsProof && !proofFile) {
      toast.error('Foto bukti wajib dilampirkan untuk status Complete.')
      return
    }

    onSubmit({
      message: message.trim(),
      ...(needsProof ? { proof_type: proofType, proof: proofFile } : {}),
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={isPending ? undefined : onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Ubah Status PO</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {order.po_number}: {getStatusConfig(order.status).label} →{' '}
              <span className="font-medium text-gray-900">{getStatusConfig(target).label}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Tutup"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm text-gray-700">
          <span className="font-medium">Catatan (opsional)</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            placeholder="Tulis catatan untuk pemesan..."
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
          <span className="text-right text-xs text-gray-400">
            {message.length}/{MAX_NOTE_LENGTH}
          </span>
        </label>

        {needsProof && (
          <fieldset className="flex flex-col gap-2 text-sm text-gray-700">
            <legend className="mb-1 font-medium">Bukti penyelesaian</legend>
            {Object.entries(PROOF_TYPE_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="proof_type"
                  value={value}
                  checked={proofType === value}
                  onChange={() => setProofType(value)}
                />
                {label}
              </label>
            ))}

            <input
              type="file"
              accept={PROOF_ACCEPT}
              onChange={handleFileChange}
              className="mt-1 block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
            <p className="text-xs text-gray-400">JPG, PNG, atau WEBP. Maksimal 5MB.</p>
          </fieldset>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md px-4 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-[#B00100] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#B33332] active:bg-[#8f0100] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Konfirmasi
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/**
 * Status cell for the History table. For roles/statuses with no allowed
 * transition (e.g. a `user`, or a terminal PO), renders a plain read-only
 * badge. For validator/admin on a PO that still has allowed transitions
 * (see lib/status.js getAllowedTransitions), renders the badge plus a
 * small dropdown of next-status actions. Picking a target opens a dialog
 * where the staff member can leave a note for the buyer; moving to
 * `complete` additionally requires a proof photo (resi or pickup), enforced
 * both here and on the backend (see backend/api/purchase_order_handlers.go
 * UpdatePurchaseOrderStatus).
 *
 * @param {{ order: PurchaseOrder, role: Role }} props
 */
export function POStatusUpdateControl({ order, role }) {
  const [isOpen, setIsOpen] = useState(false)
  /** @type {[POStatus | null, (v: POStatus | null) => void]} */
  const [pendingTarget, setPendingTarget] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const updateStatusMutation = useUpdatePOStatusMutation()

  const allowedTargets = getAllowedTransitions(order.status, role)

  function closeMenu() {
    setIsOpen(false)
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

  function handlePickTarget(target) {
    setIsOpen(false)
    setPendingTarget(target)
  }

  function handleSubmit(input) {
    if (!pendingTarget) return

    const target = pendingTarget
    updateStatusMutation.mutate(
      { id: order.id, status: target, ...input },
      {
        onSuccess: () => {
          toast.success(`Status PO ${order.po_number} diperbarui ke ${getStatusConfig(target).label}.`)
          setPendingTarget(null)
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
          </div>,
          document.body,
        )}

      {pendingTarget && (
        <StatusChangeDialog
          key={pendingTarget}
          order={order}
          target={pendingTarget}
          isPending={updateStatusMutation.isPending}
          onCancel={() => setPendingTarget(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
