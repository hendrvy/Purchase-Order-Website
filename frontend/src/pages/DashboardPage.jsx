import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS } from '@/types/role.js'
import { SummaryCards } from '@/components/dashboard/SummaryCards.jsx'
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart.jsx'
import { RecentOrdersCard } from '@/components/dashboard/RecentOrdersCard.jsx'
import { MOCK_PURCHASE_ORDERS } from '@/mocks/po.js'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Selamat datang, <span className="font-medium text-red-700">{user?.full_name}</span>.
        </p>
      </div>

      <SummaryCards orders={MOCK_PURCHASE_ORDERS} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusDistributionChart orders={MOCK_PURCHASE_ORDERS} />
        <RecentOrdersCard orders={MOCK_PURCHASE_ORDERS} />
      </div>
    </section>
  )
}
