import { useMutation } from '@tanstack/react-query'
import { deleteProfilePhoto, uploadProfilePhoto } from '@/api/profile.js'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * Wraps uploadProfilePhoto()/deleteProfilePhoto() in React Query
 * mutations, and on success merges the returned `photo_path` into
 * AuthContext so the avatar updates immediately everywhere it's rendered.
 */
export function useUploadProfilePhotoMutation() {
  const { user, updateUser } = useAuth()

  return useMutation({
    /** @param {File} file */
    mutationFn: (file) => uploadProfilePhoto(user?.id, file),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
    },
  })
}

export function useDeleteProfilePhotoMutation() {
  const { user, updateUser } = useAuth()

  return useMutation({
    mutationFn: () => deleteProfilePhoto(user?.id),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
    },
  })
}
