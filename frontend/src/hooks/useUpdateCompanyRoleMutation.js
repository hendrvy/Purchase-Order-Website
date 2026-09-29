import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCompanyRole } from '@/api/companies.js'

/**
 * @import { Role } from '@/types/role.js'
 */

/**
 * Admin-only: changes another account's role. Invalidates the companies
 * list on success so the User Management table refreshes.
 */
export function useUpdateCompanyRoleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    /** @param {{ id: number, role: Role }} input */
    mutationFn: ({ id, role }) => updateCompanyRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
