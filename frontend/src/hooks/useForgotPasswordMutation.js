import { useMutation } from '@tanstack/react-query'
import { forgotPassword } from '@/api/auth.js'

/**
 * Requests a password reset email for the given address. No AuthContext
 * involvement - the user isn't authenticated at this point.
 */
export function useForgotPasswordMutation() {
  return useMutation({
    /** @param {string} email */
    mutationFn: (email) => forgotPassword(email),
  })
}
