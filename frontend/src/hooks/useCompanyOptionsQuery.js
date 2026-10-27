import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCompanyOptions } from '@/api/companies.js'

/**
 * Staff-only: buyer accounts matching `search`, for the company-name
 * autocomplete on the create-PO form.
 *
 * @param {string} search
 * @param {{ enabled?: boolean }} [options]
 */
export function useCompanyOptionsQuery(search, options = {}) {
  return useQuery({
    queryKey: ['company-options', search],
    queryFn: () => getCompanyOptions(search),
    placeholderData: keepPreviousData,
    ...options,
  })
}
