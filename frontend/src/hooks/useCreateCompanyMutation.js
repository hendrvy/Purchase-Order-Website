import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCompany } from '@/api/companies.js'

/**
 * @import { CreateCompanyInput } from '@/api/companies.js'
 */

/**
 * Admin-only: creates a new account with an explicit role. Invalidates the
 * companies list on success so the User Management table refreshes.
 */
export function useCreateCompanyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {CreateCompanyInput} input */
    mutationFn: (input) => createCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
