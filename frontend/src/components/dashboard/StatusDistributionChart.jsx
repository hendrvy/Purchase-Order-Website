import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart.jsx'
import { PO_STATUSES } from '@/types/po.js'
import { getStatusConfig } from '@/lib/status.js'

/**
 * Builds recharts data + shadcn chart config from a per-status count map
 * (computed server-side - see GetDashboardSummaryDB). Colors are pulled from
 * getStatusConfig() so this chart stays visually consistent with the status
 * badges used elsewhere (e.g. history table).
 *
 * @param {Record<string, number>} [countsByStatus]
 */
function buildChartData(countsByStatus = {}) {
  const data = PO_STATUSES.map((status) => ({
    status,
    label: getStatusConfig(status).label,
    count: countsByStatus[status] ?? 0,
  }))

  const config = Object.fromEntries(
    PO_STATUSES.map((status) => [
      status,
      {
        label: getStatusConfig(status).label,
        color: `var(--color-status-${status}-chart)`,
      },
    ]),
  )

  return { data, config }
}

/**
 * Bar chart showing how many purchase orders fall into each status
 * (verifying, process, shipping, complete, rejected). Helps spot bottlenecks
 * at a glance on the dashboard. Clicking a bar navigates to the History page
 * pre-filtered to that status (see HistoryOrderPage.jsx, which reads the
 * same `?status=` query param back out via useSearchParams).
 *
 * @param {{ counts: Record<string, number> }} props
 */
export function StatusDistributionChart({ counts }) {
  const navigate = useNavigate()
  const { data, config } = buildChartData(counts)

  function handleBarClick(entry) {
    if (!entry?.status) return
    navigate(`/history?status=${entry.status}`)
  }

  /**
   * Custom background shape for each bar column. Covers the full chart
   * height so the entire hover-highlighted region is clickable, not just
   * the bar rectangle itself. Recharts passes the full data entry (including
   * `status`) as props here, so navigation works correctly for every column.
   */
  function ClickableBackground(props) {
    const { x, y, width, height, status } = props
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={() => handleBarClick({ status })}
      />
    )
  }

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
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={handleBarClick}
              background={<ClickableBackground />}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={`var(--color-status-${entry.status}-chart)`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
