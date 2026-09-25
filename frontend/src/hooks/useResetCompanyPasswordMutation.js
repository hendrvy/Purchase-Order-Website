import { useMutation } from '@tanstack/react-query'
import { resetCompanyPassword } from '@/api/companies.js'

/**
 * Admin-only: sets a new password for another account without needing the
 * current password.
 */
export function useResetCompanyPasswordMutation() {
  return useMutation({
    /** @param {{ id: number, newPassword: string }} input */
    mutationFn: ({ id, newPassword }) => resetCompanyPassword(id, newPassword),
  })
}
