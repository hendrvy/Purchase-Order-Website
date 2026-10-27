import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '@/api/po.js'

/**
 * Fetches the dashboard aggregates in a single request (PO counts/totals +
 * recent orders, plus per-role account counts for admins) instead of
 * listing every PO/company just to count them. See
 * backend/api/purchase_order_handlers.go GetDashboardSummary.
 */
export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })
}
