import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * @import { LoginCredentials } from '@/types/user.js'
 */

/**
 * Wraps AuthContext's login() in a React Query mutation so pages get
 * isPending/error/onSuccess handling for free.
 */
export function useLoginMutation() {
  const { login } = useAuth()

  return useMutation({
    /** @param {LoginCredentials} credentials */
    mutationFn: (credentials) => login(credentials),
  })
}
