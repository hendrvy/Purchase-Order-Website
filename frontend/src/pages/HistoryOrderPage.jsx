import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { HistoryStatusFilter } from '@/components/history/HistoryStatusFilter.jsx'
import { HistoryTable } from '@/components/history/HistoryTable.jsx'

export function HistoryOrderPage() {
  const { data: orders = [], isLoading, isError, error } = usePurchaseOrdersQuery()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredOrders = useMemo(() => {
    const byStatus =
      statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)

    const term = search.trim().toLowerCase()
    if (!term) return byStatus

    return byStatus.filter(
      (order) =>
        order.po_number?.toLowerCase().includes(term) ||
        order.title?.toLowerCase().includes(term) ||
        order.resi_number?.toLowerCase().includes(term) ||
        order.company?.company_name?.toLowerCase().includes(term),
    )
  }, [orders, statusFilter, search])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">History Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat seluruh purchase order beserta status dan lampirannya.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <HistoryStatusFilter value={statusFilter} onChange={setStatusFilter} />

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari No. PO, judul, resi, perusahaan..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
        </div>
      </div>

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