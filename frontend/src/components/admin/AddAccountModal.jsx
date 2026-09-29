import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/types/role.js'
import { useCreateCompanyMutation } from '@/hooks/useCreateCompanyMutation.js'

// Company name is only mandatory for "user" accounts (they represent an
// actual client company placing purchase orders). Validator/admin
// accounts are internal staff, so it's optional for those roles and the
// backend falls back to the username when left blank (see
// backend/api/admin_handlers.go AdminCreateCompany).
const accountSchema = z
  .object({
    username: z.string().trim().min(1, 'Username wajib diisi.').max(255, 'Maksimal 255 karakter.'),
    company_name: z.string().trim().max(255, 'Maksimal 255 karakter.').optional().or(z.literal('')),
    email: z.string().trim().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
    phone: z.string().trim().max(20, 'Maksimal 20 karakter.').optional().or(z.literal('')),
    password: z.string().min(6, 'Password minimal 6 karakter.'),
    // Only user/validator/admin can be picked here - super_admin can never
    // be assigned through the app (see ASSIGNABLE_ROLES in types/role.js).
    role: z.enum(ASSIGNABLE_ROLES, { message: 'Role wajib dipilih.' }),
  })
  .refine((data) => data.role === 'admin' || data.company_name.trim().length > 0, {
    message: 'Nama perusahaan wajib diisi untuk role User/Validator.',
    path: ['company_name'],
  })

const inputClassName =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]'

/**
 * Admin-only modal for creating a new account (user/validator/admin). See
 * backend/api/admin_handlers.go AdminCreateCompany.
 *
 * @param {{ onClose: () => void }} props
 */
export function AddAccountModal({ onClose }) {
  const createCompanyMutation = useCreateCompanyMutation()

  const form = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      username: '',
      company_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user',
    },
  })

  const selectedRole = form.watch('role')
  const isCompanyNameOptional = selectedRole === 'admin'

  const onSubmit = (values) => {
    createCompanyMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Akun berhasil dibuat.')
        onClose()
      },
      onError: (error) => toast.error(error?.message ?? 'Gagal membuat akun.'),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Tambah Akun Baru</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input id="username" type="text" className={inputClassName} {...form.register('username')} />
            {form.formState.errors.username && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Nama Perusahaan{' '}
              {isCompanyNameOptional && (
                <span className="font-normal text-gray-400">(opsional untuk Admin)</span>
              )}
            </label>
            <input
              id="company_name"
              type="text"
              placeholder={isCompanyNameOptional ? 'Default: sama dengan username' : ''}
              className={inputClassName}
              {...form.register('company_name')}
            />
            {form.formState.errors.company_name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.company_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input id="email" type="email" className={inputClassName} {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telepon <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <input id="phone" type="text" className={inputClassName} {...form.register('phone')} />
            {form.formState.errors.phone && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select id="role" className={inputClassName} {...form.register('role')}>
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {form.formState.errors.role && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.role.message}</p>
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
              isLoading={createCompanyMutation.isPending}
              className="w-auto"
            >
              Buat Akun
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
