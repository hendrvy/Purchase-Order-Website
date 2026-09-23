import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { useChangePasswordMutation } from '@/hooks/useChangePasswordMutation.js'
import {
  useDeleteProfilePhotoMutation,
  useUploadProfilePhotoMutation,
} from '@/hooks/useProfilePhotoMutation.js'
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfileMutation.js'

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const profileSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi.').max(255, 'Maksimal 255 karakter.'),
  company_name: z
    .string()
    .trim()
    .min(1, 'Nama perusahaan wajib diisi.')
    .max(255, 'Maksimal 255 karakter.'),
  email: z.string().trim().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  phone: z.string().trim().max(20, 'Maksimal 20 karakter.').optional().or(z.literal('')),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
    new_password: z.string().min(6, 'Password baru minimal 6 karakter.'),
    confirm_password: z.string().min(1, 'Konfirmasi password wajib diisi.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Konfirmasi password tidak cocok.',
    path: ['confirm_password'],
  })

const inputClassName =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]'

/**
 * Modal for editing the logged-in company's profile: photo, username,
 * email, phone, company name, and password. Follows the same
 * fullscreen-backdrop modal shell used elsewhere in the app (see
 * AttachmentPreviewModal.jsx / FilePreviewList.jsx), sized down to a form
 * width instead of a media-preview width.
 *
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function EditProfileModal({ open, onClose }) {
  const { user } = useAuth()
  const [photoError, setPhotoError] = useState(null)
  const fileInputRef = useRef(null)

  const updateProfileMutation = useUpdateProfileMutation()
  const changePasswordMutation = useChangePasswordMutation()
  const uploadPhotoMutation = useUploadProfilePhotoMutation()
  const deletePhotoMutation = useDeleteProfilePhotoMutation()

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      username: user?.username ?? '',
      company_name: user?.company_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  if (!open) return null

  const isPhotoBusy = uploadPhotoMutation.isPending || deletePhotoMutation.isPending

  const handlePhotoPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPhotoError(null)

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Format foto harus JPG, PNG, atau WEBP.')
      return
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError('Ukuran foto maksimal 2 MB.')
      return
    }

    uploadPhotoMutation.mutate(file, {
      onSuccess: () => toast.success('Foto profil berhasil diperbarui.'),
      onError: (error) => toast.error(error?.message ?? 'Gagal mengunggah foto profil.'),
    })
  }

  const handleRemovePhoto = () => {
    deletePhotoMutation.mutate(undefined, {
      onSuccess: () => toast.success('Foto profil dihapus.'),
      onError: (error) => toast.error(error?.message ?? 'Gagal menghapus foto profil.'),
    })
  }

  const onSubmitProfile = (values) => {
    updateProfileMutation.mutate(values, {
      onSuccess: () => toast.success('Profil berhasil diperbarui.'),
      onError: (error) => toast.error(error?.message ?? 'Gagal memperbarui profil.'),
    })
  }

  const onSubmitPassword = (values) => {
    changePasswordMutation.mutate(
      { current_password: values.current_password, new_password: values.new_password },
      {
        onSuccess: () => {
          toast.success('Password berhasil diubah.')
          passwordForm.reset()
        },
        onError: (error) => toast.error(error?.message ?? 'Gagal mengubah password.'),
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium text-gray-800">Edit Profile</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <ProfileAvatar user={user} size={80} />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPhotoBusy}
                aria-label="Ganti foto profil"
                className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#B00100] text-white shadow hover:bg-[#B33332] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPhotoBusy ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Camera size={13} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_PHOTO_TYPES.join(',')}
                className="sr-only"
                onChange={handlePhotoPick}
                disabled={isPhotoBusy}
              />
            </div>

            {user?.photo_path && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isPhotoBusy}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={12} />
                Hapus foto
              </button>
            )}

            {photoError && <p className="text-xs text-red-600">{photoError}</p>}
            <p className="text-center text-[11px] text-gray-400">
              JPG, PNG, atau WEBP. Maks. 2 MB.
            </p>
          </div>

          {/* Profile fields */}
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={profileForm.handleSubmit(onSubmitProfile)}
            noValidate
          >
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Informasi Profil
            </p>

            <div>
              <label htmlFor="edit-username" className="block text-xs font-medium text-gray-700">
                Username
              </label>
              <input
                id="edit-username"
                type="text"
                className={inputClassName}
                {...profileForm.register('username')}
              />
              {profileForm.formState.errors.username && (
                <p className="mt-1 text-xs text-red-600">
                  {profileForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-company-name"
                className="block text-xs font-medium text-gray-700"
              >
                Nama Perusahaan
              </label>
              <input
                id="edit-company-name"
                type="text"
                className={inputClassName}
                {...profileForm.register('company_name')}
              />
              {profileForm.formState.errors.company_name && (
                <p className="mt-1 text-xs text-red-600">
                  {profileForm.formState.errors.company_name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="edit-email" className="block text-xs font-medium text-gray-700">
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                className={inputClassName}
                {...profileForm.register('email')}
              />
              {profileForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {profileForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="edit-phone" className="block text-xs font-medium text-gray-700">
                Telepon <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <input
                id="edit-phone"
                type="text"
                className={inputClassName}
                {...profileForm.register('phone')}
              />
              {profileForm.formState.errors.phone && (
                <p className="mt-1 text-xs text-red-600">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-auto px-5"
                isLoading={updateProfileMutation.isPending}
              >
                Simpan Profil
              </Button>
            </div>
          </form>

          {/* Password fields */}
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            noValidate
          >
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Ganti Password
            </p>

            <div>
              <label
                htmlFor="edit-current-password"
                className="block text-xs font-medium text-gray-700"
              >
                Password Saat Ini
              </label>
              <input
                id="edit-current-password"
                type="password"
                autoComplete="current-password"
                className={inputClassName}
                {...passwordForm.register('current_password')}
              />
              {passwordForm.formState.errors.current_password && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-new-password"
                className="block text-xs font-medium text-gray-700"
              >
                Password Baru
              </label>
              <input
                id="edit-new-password"
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                {...passwordForm.register('new_password')}
              />
              {passwordForm.formState.errors.new_password && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-confirm-password"
                className="block text-xs font-medium text-gray-700"
              >
                Konfirmasi Password Baru
              </label>
              <input
                id="edit-confirm-password"
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                {...passwordForm.register('confirm_password')}
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-auto px-5"
                isLoading={changePasswordMutation.isPending}
              >
                Ubah Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
