import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS } from '@/types/role.js'
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
 * Full page for editing the logged-in company's profile: photo, username,
 * email, phone, company name, and password. Mirrors the form conventions
 * used in PurchaseOrderPage.jsx (react-hook-form + zod, Card layout,
 * sonner toasts).
 */
export function ProfilePage() {
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
    <div>
      <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
      <p className="mt-1 text-sm text-gray-400">Kelola informasi profil dan password Anda.</p>

      <div className="mt-6 max-w-2xl space-y-6">
        {/* Photo + identity summary */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="relative">
              <ProfileAvatar user={user} size={72} />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPhotoBusy}
                aria-label="Ganti foto profil"
                className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#B00100] text-white shadow hover:bg-[#B33332] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPhotoBusy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Camera size={12} />
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

            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.company_name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>

              <div className="mt-2 flex items-center gap-3">
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
                <p className="text-[11px] text-gray-400">JPG, PNG, atau WEBP. Maks. 2 MB.</p>
              </div>
              {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Profile fields */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              noValidate
            >
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
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
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Nama Perusahaan
                </label>
                <input
                  id="company_name"
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
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
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telepon <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <input
                  id="phone"
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

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={updateProfileMutation.isPending}
                >
                  Simpan Profil
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password fields */}
        <Card>
          <CardHeader>
            <CardTitle>Ganti Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              noValidate
            >
              <div>
                <label
                  htmlFor="current_password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password Saat Ini
                </label>
                <input
                  id="current_password"
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
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  Password Baru
                </label>
                <input
                  id="new_password"
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
                  htmlFor="confirm_password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Konfirmasi Password Baru
                </label>
                <input
                  id="confirm_password"
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

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  isLoading={changePasswordMutation.isPending}
                >
                  Ubah Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
