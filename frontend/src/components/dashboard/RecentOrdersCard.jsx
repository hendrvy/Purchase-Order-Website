import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { SortControl } from '@/components/ui/SortControl.jsx'
import { POStatusBadge } from '@/components/history/POStatusBadge.jsx'
import { formatCurrency, formatRelativeTime } from '@/lib/format.js'
import { useSort } from '@/hooks/useSort.js'

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 */

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Tanggal Diperbarui' },
  { value: 'company', label: 'Perusahaan' },
]

// Defined at module scope so the reference stays stable across renders
// (it's a dependency of the useSort memo - see hooks/useSort.js).
const SORT_ACCESSORS = {
  updated_at: (order) => new Date(order.updated_at).getTime(),
  company: (order) => order.company?.company_name ?? '',
}

/**
 * @param {{ orders: PurchaseOrder[], limit?: number }} props
 */
export function RecentOrdersCard({ orders, limit = 5 }) {
  const { field, direction, setField, toggleDirection, sortedItems } = useSort(
    orders,
    SORT_ACCESSORS,
    { initialField: 'updated_at', initialDirection: 'desc' },
  )

  const recentOrders = sortedItems.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardAction>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SortControl
              value={field}
              onChange={setField}
              direction={direction}
              onToggleDirection={toggleDirection}
              options={SORT_OPTIONS}
            />
            <Link
              to="/history"
              className="flex items-center gap-1 text-sm font-medium text-[#B00100] hover:underline"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada purchase order.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{order.title}</p>
                  <p className="text-xs text-gray-500">
                    {order.po_number} &middot; {formatRelativeTime(order.updated_at)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-medium text-gray-700">
                    {formatCurrency(order.total_amount)}
                  </span>
                  <POStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
