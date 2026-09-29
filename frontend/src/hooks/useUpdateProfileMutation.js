import { useMutation } from '@tanstack/react-query'
import { updateProfile } from '@/api/profile.js'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * @import { UpdateProfileInput } from '@/api/profile.js'
 */

/**
 * Wraps updateProfile() in a React Query mutation, and on success merges
 * the returned fields (plus a fresh JWT if the backend reissued one) into
 * AuthContext so the sidebar/profile UI updates immediately without a
 * re-login.
 */
export function useUpdateProfileMutation() {
  const { user, updateUser } = useAuth()

  return useMutation({
    /** @param {UpdateProfileInput} input */
    mutationFn: (input) => updateProfile(user?.id, input),
    onSuccess: (result) => {
      updateUser(result.user, result.token)
    },
  })
}
