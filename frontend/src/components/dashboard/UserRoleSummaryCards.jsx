import { ShieldCheck, User, UserCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/types/role.js'

/** Icon + color tint per card, keyed by item label. `super_admin` is
 * intentionally excluded (via ASSIGNABLE_ROLES below) - it's a hidden,
 * DB-only role that should never surface as its own dashboard stat, same
 * as it's excluded from the role filter in UserManagementPage. */
const ICON_STYLES = {
  'Total Akun': { icon: Users, bg: 'bg-gray-100', color: 'text-gray-600' },
  User: { icon: User, bg: 'bg-blue-50', color: 'text-blue-600' },
  Validator: { icon: UserCheck, bg: 'bg-amber-50', color: 'text-amber-600' },
  Admin: { icon: ShieldCheck, bg: 'bg-red-50', color: 'text-[#B00100]' },
}

/**
 * Admin-only dashboard summary: total accounts per role. Shown alongside
 * the regular PO SummaryCards on DashboardPage when the logged-in user is
 * an admin. Counts are computed server-side (see GetDashboardSummaryDB) so
 * the dashboard doesn't have to list every account to count them.
 *
 * @param {{ summary: { total: number, by_role: Record<string, number> } }} props
 */
export function UserRoleSummaryCards({ summary }) {
  const byRole = summary.by_role ?? {}

  const items = [
    { label: 'Total Akun', value: summary.total },
    ...ASSIGNABLE_ROLES.map((role) => ({
      label: ROLE_LABELS[role],
      value: byRole[role] ?? 0,
    })),
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => {
        const { icon: Icon, bg, color } = ICON_STYLES[item.label]

        return (
          <Card key={item.label}>
            <CardContent className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${bg} ${color}`}
              >
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-700">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
