import { useQuery } from '@tanstack/react-query'
import { getPurchaseOrderNotes } from '@/api/po.js'

/**
 * Fetches the note thread of a purchase order. Disabled until an id is
 * given (the detail modal passes null while closed).
 *
 * @param {number | null | undefined} id
 */
export function usePONotesQuery(id) {
  return useQuery({
    queryKey: ['po-notes', id],
    queryFn: () => getPurchaseOrderNotes(id),
    enabled: Boolean(id),
  })
}
