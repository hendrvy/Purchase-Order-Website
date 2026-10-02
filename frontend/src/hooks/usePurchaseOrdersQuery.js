import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getPurchaseOrders } from '@/api/po.js'

/**
 * Fetches a page of purchase orders visible to the logged-in user
 * (role-based scoping + filtering/sorting/pagination all happen server-side,
 * see backend/api/purchase_order_handlers.go GetPurchaseOrders). Keeps the
 * previous page visible while the next one loads.
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc', status?: string, search?: string }} [options]
 */
export function usePurchaseOrdersQuery(options = {}) {
  return useQuery({
    queryKey: ['purchase-orders', options],
    queryFn: () => getPurchaseOrders(options),
    placeholderData: keepPreviousData,
  })
}
