import { ROLE_LABELS } from '@/types/role.js'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Per-role badge color config, aligned with the icon tint used for each
 * role's card in UserRoleSummaryCards.jsx so the same role reads with the
 * same color everywhere in the admin UI.
 *
 * @type {Record<Role, { textClass: string, bgClass: string }>}
 */
const ROLE_BADGE_STYLES = {
  user: { textClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  validator: { textClass: 'text-amber-600', bgClass: 'bg-amber-50' },
  admin: { textClass: 'text-[#B00100]', bgClass: 'bg-red-50' },
  super_admin: { textClass: 'text-[#B00100]', bgClass: 'bg-red-50' },
}

/**
 * Role equivalent of POStatusBadge.jsx - same fixed-width pill treatment
 * (so it lines up with the dropdown chevron trigger in
 * RoleUpdateControl.jsx the same way POStatusBadge lines up inside
 * POStatusUpdateControl.jsx) but colored per role instead of per PO
 * status.
 *
 * @param {{ role: Role, className?: string, title?: string }} props
 */
export function RoleBadge({ role, className = '', title }) {
  const { textClass, bgClass } = ROLE_BADGE_STYLES[role] ?? ROLE_BADGE_STYLES.user

  return (
    <span
      title={title}
      className={`inline-flex w-[88px] items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-medium ${textClass} ${bgClass} ${className}`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
