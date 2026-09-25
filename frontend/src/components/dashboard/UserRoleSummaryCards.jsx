import { Card, CardContent } from '@/components/ui/card.jsx'
import { ROLES, ROLE_LABELS } from '@/types/role.js'

/**
 * @import { User } from '@/types/user.js'
 */

/**
 * Admin-only dashboard summary: total accounts per role. Shown alongside
 * the regular PO SummaryCards on DashboardPage when the logged-in user is
 * an admin.
 *
 * @param {{ companies: User[] }} props
 */
export function UserRoleSummaryCards({ companies }) {
  const items = [
    { label: 'Total Akun', value: companies.length },
    ...ROLES.map((role) => ({
      label: ROLE_LABELS[role],
      value: companies.filter((company) => company.role === role).length,
    })),
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent>
            <p className="text-sm text--500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-700 underline underline-offset-4 decoration-red-700">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
