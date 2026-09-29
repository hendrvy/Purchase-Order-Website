import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { useForgotPasswordMutation } from '@/hooks/useForgotPasswordMutation.js'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
})

const inputClassName =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]'

/**
 * Self-service "forgot password" entry point - user submits their
 * registered email, and (if it matches an account) receives a reset
 * link. Mirrors LoginPage's standalone full-viewport layout since this
 * page is also reached while logged out. See backend/api/
 * forgot_password_handlers.go ForgotPassword for the backend contract -
 * it always returns the same generic message regardless of whether the
 * email is registered, so this page's success state must never imply one
 * way or the other either.
 */
export function ForgotPasswordPage() {
  const mutation = useForgotPasswordMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = (values) => {
    mutation.mutate(values.email)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4">
      {/* Background blur decorations - same as LoginPage */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#D97745]/30 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#D97745]/25 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#4A4341]/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-wider text-[#4A4141]">Lupa Password?</h1>
          <p className="mt-2 text-sm text-gray-500">
            Masukkan email yang terdaftar, kami akan mengirimkan link untuk reset password Anda.
          </p>
        </div>

        {mutation.isSuccess ? (
          <div className="mt-8 space-y-5">
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {mutation.data?.message ??
                'Jika email terdaftar, kami telah mengirimkan link reset password.'}
            </p>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-[#B00100] hover:underline"
            >
              <ArrowLeft size={16} />
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                className={inputClassName}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {mutation.isError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {mutation.error?.message ?? 'Gagal mengirim link reset password. Coba lagi.'}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={mutation.isPending}
              className="w-full"
            >
              Kirim Link Reset
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
