import { CalendarDays, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePurchaseOrdersQuery } from '@/hooks/usePurchaseOrdersQuery.js'
import { HistoryStatusFilter } from '@/components/history/HistoryStatusFilter.jsx'
import { HistoryTable } from '@/components/history/HistoryTable.jsx'
import { PO_STATUSES } from '@/types/po.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { isAdminLikeRole } from '@/types/role.js'

export function HistoryOrderPage() {
  const { data: orders = [], isLoading, isError, error } = usePurchaseOrdersQuery()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  // Only validator/admin can see POs from all companies; plain users only see
  // their own, so the company-name filter is only relevant for those roles.
  const showCompanyFilter = user?.role === 'validator' || isAdminLikeRole(user?.role)

  // Lets the Dashboard's status chart deep-link here (e.g.
  // /history?status=verifying) and pre-select the matching filter - see
  // StatusDistributionChart.jsx. Falls back to 'all' for anything missing
  // or not a real PO status, so a stale/malformed query param can't
  // leave the table silently filtered to nothing.
  const statusParam = searchParams.get('status')
  const statusFilter = PO_STATUSES.includes(statusParam) ? statusParam : 'all'

  // Filter: nama (searches po_number and title)
  const [nameSearch, setNameSearch] = useState('')

  // Filter: date modified range
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Filter: nama perusahaan (company name) - validator/admin only
  const [companySearch, setCompanySearch] = useState('')

  // Keeps the ?status= query param in sync so the active filter survives
  // a refresh/share, and so switching away from a chart-driven filter via
  // the pill buttons below updates the URL too (replace, not push - this
  // is a filter, not a new "page" worth of back-button history).
  function handleStatusFilterChange(nextStatus) {
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

  function clearAllFilters() {
    setNameSearch('')
    setDateFrom('')
    setDateTo('')
    setCompanySearch('')
    handleStatusFilterChange('all')
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    nameSearch.trim() !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    companySearch.trim() !== ''

  const filteredOrders = useMemo(() => {
    // 1. Status filter
    let result =
      statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)

    // 2. Name filter (po_number + title)
    const nameTerm = nameSearch.trim().toLowerCase()
    if (nameTerm) {
      result = result.filter(
        (order) =>
          order.po_number?.toLowerCase().includes(nameTerm) ||
          order.title?.toLowerCase().includes(nameTerm),
      )
    }

    // 3. Date modified range filter (inclusive, based on updated_at date part)
    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((order) => new Date(order.updated_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((order) => new Date(order.updated_at) <= to)
    }

    // 4. Company name filter (validator/admin only)
    const companyTerm = companySearch.trim().toLowerCase()
    if (companyTerm && showCompanyFilter) {
      result = result.filter((order) =>
        order.company?.company_name?.toLowerCase().includes(companyTerm),
      )
    }

    return result
  }, [orders, statusFilter, nameSearch, dateFrom, dateTo, companySearch, showCompanyFilter])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">History Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat seluruh purchase order beserta status dan lampirannya.
        </p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HistoryStatusFilter value={statusFilter} onChange={handleStatusFilterChange} />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={14} />
            Reset filter
          </button>
        )}
      </div>

      {/* Advanced filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Filter: Nama (No. PO / Judul) */}
        <div className="relative w-full sm:w-60">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Cari No. PO atau judul..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
          {nameSearch && (
            <button
              type="button"
              onClick={() => setNameSearch('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Hapus filter nama"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter: Nama perusahaan (validator/admin only) */}
        {showCompanyFilter && (
          <div className="relative w-full sm:w-56">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Cari nama perusahaan..."
              className="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
            />
            {companySearch && (
              <button
                type="button"
                onClick={() => setCompanySearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Hapus filter perusahaan"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Filter: Date modified range */}
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="shrink-0 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Diperbarui dari tanggal"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
          <span className="text-xs text-gray-400">s/d</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            title="Diperbarui sampai tanggal"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Hapus filter tanggal"
            >
              <X size={14} />
            </button>
          )}
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
