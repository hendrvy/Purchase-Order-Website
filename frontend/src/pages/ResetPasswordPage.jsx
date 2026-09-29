import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { useResetPasswordMutation } from '@/hooks/useResetPasswordMutation.js'

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
 * Final step of the "forgot password" flow: reached via the link emailed
 * by ForgotPasswordPage (?token=... query param). Submits the token plus
 * a new password to backend/api/forgot_password_handlers.go
 * ResetPassword. On success, redirects to /login (no auto-login - the
 * user signs in manually with the new password, same as
 * ResetPasswordModal's admin-initiated reset).
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mutation = useResetPasswordMutation()
  const token = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = (values) => {
    mutation.mutate(
      { token, newPassword: values.new_password },
      {
        onSuccess: () => {
          setTimeout(() => navigate('/login', { replace: true }), 1500)
        },
      },
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4">
      {/* Background blur decorations - same as LoginPage */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#D97745]/30 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#D97745]/25 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#4A4341]/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-wider text-[#4A4141]">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-500">Buat password baru untuk akun Anda.</p>
        </div>

        {!token ? (
          <div className="mt-8 space-y-5">
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              Link reset password tidak valid. Silakan minta link baru.
            </p>
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-[#B00100] hover:underline"
            >
              <ArrowLeft size={16} />
              Minta Link Baru
            </Link>
          </div>
        ) : mutation.isSuccess ? (
          <div className="mt-8 space-y-5">
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {mutation.data?.message ?? 'Password berhasil direset.'} Mengalihkan ke halaman
              login...
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                Password Baru
              </label>
              <input
                id="new_password"
                type="password"
                autoComplete="new-password"
                autoFocus
                className={inputClassName}
                {...register('new_password')}
              />
              {errors.new_password && (
                <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700"
              >
                Konfirmasi Password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
              )}
            </div>

            {mutation.isError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {mutation.error?.message ?? 'Gagal mereset password. Coba lagi.'}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={mutation.isPending}
              className="w-full"
            >
              Reset Password
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-[#D97745]"
            >
              <ArrowLeft size={14} />
              Kembali ke Login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
