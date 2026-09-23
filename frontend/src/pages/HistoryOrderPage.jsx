import { useMemo, useState } from 'react'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { HistoryStatusFilter } from '@/components/history/HistoryStatusFilter.jsx'
import { HistoryTable } from '@/components/history/HistoryTable.jsx'

export function HistoryOrderPage() {
  const { data: orders = [], isLoading, isError, error } = usePurchaseOrdersQuery()
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredOrders = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)),
    [orders, statusFilter],
  )

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">History Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat seluruh purchase order beserta status dan lampirannya.
        </p>
      </div>

      <HistoryStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {isLoading && <p className="text-sm text-gray-400">Memuat data purchase order...</p>}

      {isError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error?.message ?? 'Gagal memuat data purchase order.'}
        </p>
      )}

      {!isLoading && !isError && <HistoryTable orders={filteredOrders} />}
    </section>
  )
}