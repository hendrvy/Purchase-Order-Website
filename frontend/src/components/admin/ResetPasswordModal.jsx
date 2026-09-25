import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { useResetCompanyPasswordMutation } from '@/hooks/useResetCompanyPasswordMutation.js'

/**
 * @import { User } from '@/types/user.js'
 */

const resetPasswordSchema = z
  .object({
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
 * Admin-only modal to force-set a new password for another account (see
 * backend/api/admin_handlers.go AdminResetCompanyPassword).
 *
 * @param {{ targetUser: User, onClose: () => void }} props
 */
export function ResetPasswordModal({ targetUser, onClose }) {
  const resetPasswordMutation = useResetCompanyPasswordMutation()

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = (values) => {
    resetPasswordMutation.mutate(
      { id: targetUser.id, newPassword: values.new_password },
      {
        onSuccess: () => {
          toast.success(`Password ${targetUser.username} berhasil direset.`)
          onClose()
        },
        onError: (error) => toast.error(error?.message ?? 'Gagal mereset password.'),
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">
            Reset Password - {targetUser.username}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-4 px-5 py-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
              Password Baru
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...form.register('new_password')}
            />
            {form.formState.errors.new_password && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.new_password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
              Konfirmasi Password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...form.register('confirm_password')}
            />
            {form.formState.errors.confirm_password && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.confirm_password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-auto">
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={resetPasswordMutation.isPending}
              className="w-auto"
            >
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
