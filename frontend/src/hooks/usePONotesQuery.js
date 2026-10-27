import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPurchaseOrderNotes } from '@/api/po.js'
import { UNREAD_NOTES_QUERY_KEY } from '@/hooks/useUnreadNotesQuery.js'

/**
 * Fetches the note thread of a purchase order. Disabled until an id is
 * given (the detail modal passes null while closed).
 *
 * The backend marks the thread as read for the current user on this
 * request, so the dashboard's unread notification is refreshed afterwards.
 *
 * @param {number | null | undefined} id
 */
export function usePONotesQuery(id) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['po-notes', id],
    queryFn: async () => {
      const notes = await getPurchaseOrderNotes(id)
      queryClient.invalidateQueries({ queryKey: UNREAD_NOTES_QUERY_KEY })
      return notes
    },
    enabled: Boolean(id),
  })
}
