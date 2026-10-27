import { useQuery } from '@tanstack/react-query'
import { getUnreadNotes } from '@/api/po.js'

export const UNREAD_NOTES_QUERY_KEY = ['unread-notes']

/**
 * Purchase orders with unread messages in their note thread. Polled so a
 * new reply shows up on an open dashboard without a manual refresh.
 */
export function useUnreadNotesQuery() {
  return useQuery({
    queryKey: UNREAD_NOTES_QUERY_KEY,
    queryFn: getUnreadNotes,
    refetchInterval: 30_000,
  })
}
