import { useQuery } from '@tanstack/react-query'
import { getPurchaseOrderById } from '@/api/po.js'

/**
 * Fetches a single purchase order. Disabled until an id is given (used to
 * open the detail modal from a deep link such as a dashboard notification).
 *
 * @param {number | null | undefined} id
 */
export function usePurchaseOrderQuery(id) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrderById(id),
    enabled: Boolean(id),
  })
}
