import { AlertCircle, CheckCircle2, ClipboardList, Loader } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card.jsx'

/**
 * Counts orders that need attention: still awaiting verification, or
 * rejected orders that may need revision/resubmission.
 *
 * @param {Record<string, number>} countsByStatus
 */
function countNeedsAction(countsByStatus) {
  return (countsByStatus.verifying ?? 0) + (countsByStatus.rejected ?? 0)
}

/**
 * Counts how many orders are currently in process or shipping status
 * (i.e. approved and actively being fulfilled).
 *
 * @param {Record<string, number>} countsByStatus
 */
function countInProgress(countsByStatus) {
  return (countsByStatus.process ?? 0) + (countsByStatus.shipping ?? 0)
}

/** Icon + color tint per card, keyed by item label. */
const ICON_STYLES = {
  'Total PO': { icon: ClipboardList, bg: 'bg-gray-100', color: 'text-gray-600' },
  'Need Approval': { icon: AlertCircle, bg: 'bg-blue-50', color: 'text-blue-600' },
  'On Progress': { icon: Loader, bg: 'bg-amber-50', color: 'text-amber-600' },
  Completed: { icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
}

/**
 * @param {{ summary: { total: number, counts_by_status: Record<string, number>, completed_this_month: number } }} props
 */
export function SummaryCards({ summary }) {
  const counts = summary.counts_by_status ?? {}

  const items = [
    { label: 'Total PO', value: summary.total },
    { label: 'Need Approval', value: countNeedsAction(counts) },
    { label: 'On Progress', value: countInProgress(counts) },
    { label: 'Completed', value: summary.completed_this_month },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => {
        const { icon: Icon, bg, color } = ICON_STYLES[item.label]

        return (
          <Card key={item.label}>
            <CardContent className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${bg} ${color}`}
              >
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-700">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
