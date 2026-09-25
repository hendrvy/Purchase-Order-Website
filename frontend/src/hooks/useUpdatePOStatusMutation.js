import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePurchaseOrderStatus } from '@/api/po.js'

/**
 * @import { POStatus } from '@/types/po.js'
 */

/**
 * Wraps updatePurchaseOrderStatus() in a React Query mutation (validator/
 * admin only - enforced server-side). Invalidates the PO list so History/
 * Dashboard reflect the new status immediately.
 */
export function useUpdatePOStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {{ id: number, status: POStatus, resi_number?: string, notes?: string }} input */
    mutationFn: ({ id, ...input }) => updatePurchaseOrderStatus(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
