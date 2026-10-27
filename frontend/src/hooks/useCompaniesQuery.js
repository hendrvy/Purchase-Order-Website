import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCompanies } from '@/api/companies.js'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Admin-only: fetches a page of companies/users, filtered by role and/or
 * search and sorted/paginated server-side (see
 * backend/api/admin_handlers.go AdminListCompanies). Keeps the previous page
 * visible while the next one loads.
 *
 * @param {{ role?: Role | 'all', search?: string, page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc' }} [filters]
 * @param {{ enabled?: boolean }} [options] - e.g. `{ enabled: isAdmin }` to skip the request for non-admins.
 */
export function useCompaniesQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => getCompanies(filters),
    placeholderData: keepPreviousData,
    ...options,
  })
}
