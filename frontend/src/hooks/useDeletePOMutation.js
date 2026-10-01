import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePurchaseOrder } from '@/api/po.js'

/**
 * Wraps deletePurchaseOrder() in a React Query mutation. Meant to be used
 * by a `user`-role account cancelling their own PO while it's still in
 * 'verifying' status - the backend enforces both the ownership and
 * status checks (see
 * backend/api/purchase_order_handlers.go DeletePurchaseOrder), this hook
 * just surfaces whatever error it returns. Invalidates the PO list so
 * History/Dashboard drop the cancelled order immediately.
 */
export function useDeletePOMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {number} id */
    mutationFn: (id) => deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
