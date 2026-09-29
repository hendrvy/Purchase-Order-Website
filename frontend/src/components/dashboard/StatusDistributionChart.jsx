import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart.jsx'
import { PO_STATUSES } from '@/types/po.js'
import { getStatusConfig } from '@/lib/status.js'

/**
 * @import { PurchaseOrder } from '@/types/po.js'
 */

/**
 * Builds recharts data + shadcn chart config from a list of purchase
 * orders, counting how many fall into each PO_STATUSES bucket. Colors are
 * pulled from getStatusConfig() so this chart stays visually consistent
 * with the status badges used elsewhere (e.g. history table).
 *
 * @param {PurchaseOrder[]} orders
 */
function buildChartData(orders) {
  const counts = Object.fromEntries(PO_STATUSES.map((status) => [status, 0]))

  for (const order of orders) {
    if (order.status in counts) {
      counts[order.status] += 1
    }
  }

  const data = PO_STATUSES.map((status) => ({
    status,
    label: getStatusConfig(status).label,
    count: counts[status],
  }))

  const config = Object.fromEntries(
    PO_STATUSES.map((status) => [
      status,
      {
        label: getStatusConfig(status).label,
        color: `var(--color-status-${status})`,
      },
    ]),
  )

  return { data, config }
}

/**
 * Bar chart showing how many purchase orders fall into each status
 * (draft, verification, processing, shipping, completed, rejected,
 * cancelled). Helps spot bottlenecks at a glance on the dashboard.
 *
 * @param {{ orders: PurchaseOrder[] }} props
 */
export function StatusDistributionChart({ orders }) {
  const { data, config } = buildChartData(orders)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribusi Status Purchase Order</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={`var(--color-status-${entry.status})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
