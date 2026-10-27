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
    /** @param {{ id: number, status: POStatus, message?: string, proof_type?: 'resi' | 'pickup', proof?: File }} input */
    mutationFn: ({ id, ...input }) => updatePurchaseOrderStatus(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['po-notes', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
