import { useProfilePhotoUrl } from '@/hooks/useProfilePhotoUrl.js'

/**
 * @import { User } from '@/types/user.js'
 */

/**
 * Renders a company's profile photo if one is set, falling back to a
 * circle with the first letter of the company name (same fallback used
 * previously inline in AppLayout).
 *
 * @param {{ user: User | null | undefined, size?: number, className?: string }} props
 */
export function ProfileAvatar({ user, size = 36, className = '' }) {
  const photoUrl = useProfilePhotoUrl(user?.id, user?.photo_path)

  const style = { width: size, height: size }

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={user?.company_name ?? 'Profile'}
        style={style}
        className={`flex-shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      style={style}
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 ${className}`}
    >
      {user?.company_name?.charAt(0).toUpperCase()}
    </div>
  )
}
