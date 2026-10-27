import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPurchaseOrderNote } from '@/api/po.js'

/**
 * Wraps createPurchaseOrderNote() in a React Query mutation. Refreshes the
 * thread and the PO list (posting a note bumps the PO's updated_at).
 */
export function useCreatePONoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {{ id: number, message: string, parent_id?: number }} input */
    mutationFn: ({ id, ...input }) => createPurchaseOrderNote(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['po-notes', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
