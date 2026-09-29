import { useAuth } from '@/context/AuthContext.jsx'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { useCompaniesQuery } from '@/hooks/useCompaniesQuery.js'
import { SummaryCards } from '@/components/dashboard/SummaryCards.jsx'
import { UserRoleSummaryCards } from '@/components/dashboard/UserRoleSummaryCards.jsx'
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart.jsx'
import { RecentOrdersCard } from '@/components/dashboard/RecentOrdersCard.jsx'
import { isAdminLikeRole } from '@/types/role.js'

export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = isAdminLikeRole(user?.role)
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
          {isAdmin && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">1. Informasi Akun</h2>
              <UserRoleSummaryCards companies={companies} />
            </div>
          )}

          <div className="space-y-3">
            {/* Numbering shifts to "1." when the admin-only Informasi Akun
                section above isn't rendered, so the sections stay
                sequentially numbered regardless of role. */}
            <h2 className="text-sm font-semibold text-gray-700">
              {isAdmin ? '2' : '1'}. Informasi PO
            </h2>
            <SummaryCards orders={orders} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <StatusDistributionChart orders={orders} />
            <RecentOrdersCard orders={orders} />
          </div>
        </>
      )}
    </section>
  )
}
