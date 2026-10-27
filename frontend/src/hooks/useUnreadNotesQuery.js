import { useQuery } from '@tanstack/react-query'
import { getUnreadNotes } from '@/api/po.js'

export const UNREAD_NOTES_QUERY_KEY = ['unread-notes']

/**
 * Purchase orders with unread messages in their note thread. Polled so a
 * new reply shows up without a manual refresh.
 *
 * @param {{ enabled?: boolean }} [options]
 */
export function useUnreadNotesQuery(options = {}) {
  return useQuery({
    queryKey: UNREAD_NOTES_QUERY_KEY,
    queryFn: getUnreadNotes,
    refetchInterval: 30_000,
    ...options,
  })
}
