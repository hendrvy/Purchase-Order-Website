import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/types/role.js'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition.js'
import { useClickOutside } from '@/hooks/useClickOutside.js'
import { RoleBadge } from '@/components/admin/RoleBadge.jsx'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Role equivalent of POStatusUpdateControl.jsx - same badge + chevron
 * trigger opening a portaled dropdown of options, reused here for
 * UserManagementPage's role column instead of a plain native
 * `<select>`. The portal (rendered into `document.body` via
 * `createPortal`) keeps the panel from being clipped by the table's
 * `overflow-x-auto` wrapper or the surrounding Card, same rationale as
 * POStatusUpdateControl.
 *
 * Unlike POStatusUpdateControl, picking an option here doesn't mutate
 * anything itself - it just reports the choice via `onSelect` and closes.
 * The actual confirm-dialog + mutation flow stays owned by
 * UserManagementPage (changing a role is a bigger deal than changing a
 * PO's status, so it already gates the mutation behind a confirmation
 * dialog - see handleRoleChange/confirmRoleChange there).
 *
 * @param {{
 *   role: Role,
 *   disabled?: boolean,
 *   disabledTitle?: string,
 *   onSelect: (role: Role) => void,
 * }} props
 */
export function RoleUpdateControl({ role, disabled = false, disabledTitle, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useClickOutside(isOpen, [triggerRef, menuRef], () => setIsOpen(false))

  // See POStatusUpdateControl.jsx for the full rationale on why this is
  // portaled + anchored instead of a plain `position: absolute` dropdown.
  const menuPosition = useAnchoredPosition(isOpen, triggerRef, 160)

  function handlePick(target) {
    setIsOpen(false)
    if (target !== role) onSelect(target)
  }

  return (
    <div className="relative inline-block">
      {/* Same always-visible border/background rationale as
          POStatusUpdateControl's trigger - gives this a clear "button"
          affordance at rest, not just on hover (which doesn't exist on
          touch devices). */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1 rounded-full border border-gray-300 bg-white py-0.5 pr-1.5 pl-0.5 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:bg-white"
      >
        <RoleBadge role={role} />
        <ChevronDown size={14} className="text-gray-500" />
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'absolute', top: menuPosition.top, left: menuPosition.left }}
            className="z-50 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          >
            <div className="flex flex-col gap-1">
              <p className="px-1 pb-1 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                Ubah role ke
              </p>
              {ASSIGNABLE_ROLES.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => handlePick(target)}
                  className="rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-100 active:bg-gray-200"
                >
                  {ROLE_LABELS[target]}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
