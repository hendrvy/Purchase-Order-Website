import { useAuth } from '@/context/AuthContext.jsx'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { useCompaniesQuery } from '@/hooks/useCompaniesQuery.js'
import { SummaryCards } from '@/components/dashboard/SummaryCards.jsx'
import { UserRoleSummaryCards } from '@/components/dashboard/UserRoleSummaryCards.jsx'
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart.jsx'
import { RecentOrdersCard } from '@/components/dashboard/RecentOrdersCard.jsx'

export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { data: orders = [], isLoading, isError, error } = usePurchaseOrdersQuery()
  const { data: companies = [] } = useCompaniesQuery(undefined, { enabled: isAdmin })

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Selamat datang, <span className="font-medium text-red-700">{user?.company_name}</span>.
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Memuat data purchase order...</p>}

      {isError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error?.message ?? 'Gagal memuat data purchase order.'}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          {isAdmin && <UserRoleSummaryCards companies={companies} />}

          <SummaryCards orders={orders} />

          <div className="grid gap-6 lg:grid-cols-2">
            <StatusDistributionChart orders={orders} />
            <RecentOrdersCard orders={orders} />
          </div>
        </>
      )}
    </section>
  )
}
