import { Card, CardContent } from '@/components/ui/card.jsx'

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 */

/**
 * Counts how many orders are currently in process or shipping status
 * (i.e. approved and actively being fulfilled).
 *
 * @param {PurchaseOrder[]} orders
 */
function countInProgress(orders) {
  return orders.filter((order) => order.status === 'process' || order.status === 'shipping')
    .length
}

/**
 * Counts how many orders were completed within the current calendar month.
 *
 * @param {PurchaseOrder[]} orders
 */
function countCompletedThisMonth(orders) {
  const now = new Date()

  return orders.filter((order) => {
    if (order.status !== 'complete') return false
    const updatedAt = new Date(order.updated_at)
    return (
      updatedAt.getMonth() === now.getMonth() && updatedAt.getFullYear() === now.getFullYear()
    )
  }).length
}

/**
 * Counts orders that need attention: still awaiting verification, or
 * rejected orders that may need revision/resubmission.
 *
 * @param {PurchaseOrder[]} orders
 */
function countNeedsAction(orders) {
  return orders.filter((order) => order.status === 'verifying' || order.status === 'rejected')
    .length
}

/**
 * @param {{ orders: PurchaseOrder[] }} props
 */
export function SummaryCards({ orders }) {
  const items = [
    { label: 'Total PO', value: orders.length },
    { label: 'Need Approval', value: countNeedsAction(orders) },
    { label: 'On Progress', value: countInProgress(orders) },
    { label: 'Completed', value: countCompletedThisMonth(orders) },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent>
            <p className="text-sm text--500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-700 underline underline-offset-4 decoration-red-700">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
