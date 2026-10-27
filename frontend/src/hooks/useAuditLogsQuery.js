import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getDownloadLogs, getPasswordChangeLogs, getProfileChangeLogs } from '@/api/audit.js'

/** @typedef {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} AuditLogQueryOptions */

/**
 * Admin-only: fetches a page of profile field change audit history.
 * @param {AuditLogQueryOptions} [options]
 */
export function useProfileChangeLogsQuery(options = {}) {
  return useQuery({
    queryKey: ['audit', 'profile-changes', options],
    queryFn: () => getProfileChangeLogs(options),
    placeholderData: keepPreviousData,
  })
}

/**
 * Admin-only: fetches a page of password change audit history.
 * @param {AuditLogQueryOptions} [options]
 */
export function usePasswordChangeLogsQuery(options = {}) {
  return useQuery({
    queryKey: ['audit', 'password-changes', options],
    queryFn: () => getPasswordChangeLogs(options),
    placeholderData: keepPreviousData,
  })
}

/**
 * Admin-only: fetches a page of attachment download audit history.
 * @param {AuditLogQueryOptions} [options]
 */
export function useDownloadLogsQuery(options = {}) {
  return useQuery({
    queryKey: ['audit', 'downloads', options],
    queryFn: () => getDownloadLogs(options),
    placeholderData: keepPreviousData,
  })
}
