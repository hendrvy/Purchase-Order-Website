import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { getStatusConfig } from '@/lib/status.js'
import { formatCurrency, formatRelativeTime } from '@/lib/format.js'

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 */

/**
 * @param {{ orders: PurchaseOrder[], limit?: number }} props
 */
export function RecentOrdersCard({ orders, limit = 5 }) {
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardAction>
          <Link
            to="/history"
            className="flex items-center gap-1 text-sm font-medium text-[#B00100] hover:underline"
          >
            View All
            <ArrowRight size={14} />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada purchase order.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const status = getStatusConfig(order.status)

              return (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{order.title}</p>
                    <p className="text-xs text-gray-500">
                      {order.po_number} &middot; {formatRelativeTime(order.updated_at)}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.textClass} ${status.bgClass}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
