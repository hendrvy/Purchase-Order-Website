import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMPTY_PAGINATION_META } from '@/api/client.js'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { useDebouncedValue } from '@/hooks/useDebouncedValue.js'
import { useServerSort } from '@/hooks/useServerSort.js'
import { HistoryStatusFilter } from '@/components/history/HistoryStatusFilter.jsx'
import { HistoryTable } from '@/components/history/HistoryTable.jsx'
import { PO_STATUSES } from '@/types/po.js'

const PAGE_SIZE = 10

export function HistoryOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Lets the Dashboard's status chart deep-link here (e.g.
  // /history?status=verifying) and pre-select the matching filter - see
  // StatusDistributionChart.jsx. Falls back to 'all' for anything missing
  // or not a real PO status, so a stale/malformed query param can't
  // leave the table silently filtered to nothing.
  const statusParam = searchParams.get('status')
  const statusFilter = PO_STATUSES.includes(statusParam) ? statusParam : 'all'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const trimmedSearch = debouncedSearch.trim()

  const [page, setPage] = useState(1)
  const { sort, order, setSort, toggleOrder } = useServerSort('updated_at', 'desc')

  // Any filter/sort change alters the result set, so the previous page
  // offset is no longer meaningful - the handlers below reset to page 1
  // (done here rather than in an effect so the reset happens in the same
  // render as the change).
  function handleSearchChange(value) {
    setSearch(value)
    setPage(1)
  }

  function handleSortChange(field) {
    setSort(field)
    setPage(1)
  }

  function handleToggleOrder() {
    toggleOrder()
    setPage(1)
  }

  const { data, isLoading, isError, error } = usePurchaseOrdersQuery({
    page,
    limit: PAGE_SIZE,
    sort,
    order,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: trimmedSearch || undefined,
  })

  const orders = data?.items ?? []
  const meta = data?.meta ?? { ...EMPTY_PAGINATION_META, page_size: PAGE_SIZE }

  // Keeps the ?status= query param in sync so the active filter survives
  // a refresh/share, and so switching away from a chart-driven filter via
  // the pill buttons below updates the URL too (replace, not push - this
  // is a filter, not a new "page" worth of back-button history).
  function handleStatusFilterChange(nextStatus) {
    setPage(1)
    setSearchParams(
      (params) => {
        if (nextStatus === 'all') {
          params.delete('status')
        } else {
          params.set('status', nextStatus)
        }
        return params
      },
      { replace: true },
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">History Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat seluruh purchase order beserta status dan lampirannya.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <HistoryStatusFilter value={statusFilter} onChange={handleStatusFilterChange} />

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
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

      {!isLoading && !isError && (
        <HistoryTable
          orders={orders}
          meta={meta}
          sort={sort}
          order={order}
          onSortChange={handleSortChange}
          onToggleOrder={handleToggleOrder}
          onPageChange={setPage}
        />
      )}
    </section>
  )
}
