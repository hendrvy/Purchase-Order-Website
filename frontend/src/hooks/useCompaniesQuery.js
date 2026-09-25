import { useQuery } from '@tanstack/react-query'
import { getCompanies } from '@/api/companies.js'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Admin-only: fetches the list of all companies/users, optionally filtered
 * by role and/or a search term (see backend/api/admin_handlers.go
 * AdminListCompanies).
 *
 * @param {{ role?: Role | 'all', search?: string }} [filters]
 * @param {{ enabled?: boolean }} [options] - e.g. `{ enabled: isAdmin }` to skip the request for non-admins.
 */
export function useCompaniesQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => getCompanies(filters),
    ...options,
  })
}
