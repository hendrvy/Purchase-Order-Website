import { useQuery } from '@tanstack/react-query'
import { getDownloadLogs, getPasswordChangeLogs, getProfileChangeLogs } from '@/api/audit.js'

/** Admin-only: fetches profile field change audit history. */
export function useProfileChangeLogsQuery() {
  return useQuery({
    queryKey: ['audit', 'profile-changes'],
    queryFn: getProfileChangeLogs,
  })
}

/** Admin-only: fetches password change audit history. */
export function usePasswordChangeLogsQuery() {
  return useQuery({
    queryKey: ['audit', 'password-changes'],
    queryFn: getPasswordChangeLogs,
  })
}

/** Admin-only: fetches attachment download audit history. */
export function useDownloadLogsQuery() {
  return useQuery({
    queryKey: ['audit', 'downloads'],
    queryFn: getDownloadLogs,
  })
}
