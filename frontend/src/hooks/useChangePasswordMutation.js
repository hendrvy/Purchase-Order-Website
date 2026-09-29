import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/profile.js'

/**
 * Wraps changePassword() in a React Query mutation. No AuthContext update
 * needed - the password isn't stored client-side and the JWT doesn't
 * embed it.
 */
export function useChangePasswordMutation() {
  return useMutation({
    /** @param {{ current_password: string, new_password: string }} input */
    mutationFn: (input) => changePassword(input),
  })
}
