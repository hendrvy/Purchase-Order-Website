import { useQuery } from '@tanstack/react-query'
import { getPurchaseOrders } from '@/api/po.js'

/**
 * Fetches the list of purchase orders visible to the logged-in user
 * (role-based filtering happens server-side, see
 * backend/api/purchase_order_handlers.go GetPurchaseOrders).
 *
 * @param {{ page?: number, limit?: number }} [options]
 */
export function usePurchaseOrdersQuery(options = {}) {
  return useQuery({
    queryKey: ['purchase-orders', options],
    queryFn: () => getPurchaseOrders(options),
  })
}
