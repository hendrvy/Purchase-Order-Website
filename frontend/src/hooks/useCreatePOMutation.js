import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPurchaseOrder } from '@/api/po.js'

/**
 * @import { CreatePOInput } from '@/types/po.js'
 */

/**
 * Wraps createPurchaseOrder() in a React Query mutation so the create-PO
 * page gets isPending/error/onSuccess handling for free, and invalidates
 * any cached PO list/dashboard queries once a new PO is created.
 */
export function useCreatePOMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {CreatePOInput} input */
    mutationFn: (input) => createPurchaseOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
