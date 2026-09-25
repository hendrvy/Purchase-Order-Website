import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '@/api/auth.js'

/**
 * Completes the forgot-password flow: submits the token from the emailed
 * reset link plus a new password. No AuthContext involvement - on
 * success the user is sent back to /login to sign in manually with the
 * new password (see ResetPasswordPage.jsx).
 */
export function useResetPasswordMutation() {
  return useMutation({
    /** @param {{ token: string, newPassword: string }} input */
    mutationFn: (input) => resetPassword(input),
  })
}
