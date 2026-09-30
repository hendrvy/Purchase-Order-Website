import { X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

/**
 * Generic yes/no confirmation modal for actions that shouldn't fire
 * immediately on a single click/change (e.g. changing a user's role -
 * see UserManagementPage.jsx). Follows the same overlay/panel markup as
 * the other admin modals (ResetPasswordModal.jsx, AddAccountModal.jsx) so
 * it looks consistent, but is generic/reusable instead of tied to one
 * specific action.
 *
 * Rendered conditionally by the caller (e.g. `{pending && <ConfirmDialog ... />}`)
 * rather than accepting an `open` prop, since there's usually per-action
 * data (like which row is being confirmed) that only exists once the
 * confirmation is actually pending anyway.
 *
 * @param {{
 *   title: string,
 *   description: import('react').ReactNode,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   isLoading?: boolean,
 *   variant?: 'primary' | 'danger',
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  isLoading = false,
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 text-sm text-gray-600">{description}</div>

        <div className="flex justify-end gap-2 px-5 pb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
