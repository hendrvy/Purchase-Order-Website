import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext.jsx'
import { useLoginMutation } from '@/hooks/useLoginMutation.js'
import { Button } from '@/components/ui/button.jsx'

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi.'),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
})

// Login always drops the user on /dashboard - it intentionally does NOT
// send them back to whatever protected page they originally tried to
// visit (no `location.state.from` handling here), per product decision.
const DASHBOARD_PATH = '/dashboard'

export function LoginPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const mutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  // Already logged in - don't show the login form again.
  if (token && user) {
    return <Navigate to={DASHBOARD_PATH} replace />
  }

  const onSubmit = (values) => {
    mutation.mutate(values, {
      onSuccess: () => {
        navigate(DASHBOARD_PATH, { replace: true })
      },
    })
  }

  return (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4">

    {/* Background blur decorations */}
    <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#D97745]/30 blur-[120px]" />

    <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#D97745]/25 blur-[120px]" />

    <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#4A4341]/20 blur-[120px]" />


    {/* Login Content */}
    <div className="relative z-10 w-full max-w-md rounded-lg p-6">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-5xl font-semibold tracking-wider text-[#4A4141]">
          Welcome to <br />
          SMS ORDER
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Login to Continue..
        </p>
      </div>


      {/* Login Form */}
      <form
        className="mt-8 space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >

        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>

          <input
            id="username"
            type="text"
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
            {...register('username')}
          />

          {errors.username && (
            <p className="mt-1 text-xs text-red-600">
              {errors.username.message}
            </p>
          )}
        </div>


        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
            {...register('password')}
          />

          {/* Forgot Password */}
          <div className="mt-2 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-gray-500 transition-colors hover:text-[#D97745]"
            >
              Forgot Password?
            </Link>
          </div>

          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>


        {/* Error */}
        {mutation.isError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {mutation.error?.message ?? 'Gagal masuk. Coba lagi.'}
          </p>
        )}


        {/* Login Button */}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={mutation.isPending}
          className="w-full"
        >
          Login
        </Button>

      </form>
    </div>
  </div>
)
}
