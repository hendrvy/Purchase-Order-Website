import { KeyRound, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { formatDate } from '@/lib/format.js'
import { ROLES, ROLE_LABELS } from '@/types/role.js'
import { useCompaniesQuery } from '@/hooks/useCompaniesQuery.js'
import { useUpdateCompanyRoleMutation } from '@/hooks/useUpdateCompanyRoleMutation.js'
import { AddAccountModal } from '@/components/admin/AddAccountModal.jsx'
import { ResetPasswordModal } from '@/components/admin/ResetPasswordModal.jsx'

const selectClassName =
  'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Admin-only page: lists every account (company) in the system with its
 * role, lets the admin change a user's role inline, reset their password,
 * or create a brand new account. See backend/api/admin_handlers.go for the
 * underlying endpoints (all gated to role == "admin").
 */
export function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null)

  const {
    data: companies = [],
    isLoading,
    isError,
    error,
  } = useCompaniesQuery({ role: roleFilter, search })

  const updateRoleMutation = useUpdateCompanyRoleMutation()

  const handleRoleChange = (company, newRole) => {
    if (newRole === company.role) return

    updateRoleMutation.mutate(
      { id: company.id, role: newRole },
      {
        onSuccess: () =>
          toast.success(`Role ${company.username} diubah menjadi ${ROLE_LABELS[newRole]}.`),
        onError: (err) => toast.error(err?.message ?? 'Gagal mengubah role.'),
      },
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kelola User</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola seluruh akun, ubah role, reset password, dan tambah akun baru.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setIsAddAccountOpen(true)}
          className="flex w-auto items-center gap-1.5"
        >
          <Plus size={16} />
          Tambah Akun
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', ...ROLES].map((role) => {
            const isActive = roleFilter === role
            const label = role === 'all' ? 'Semua' : ROLE_LABELS[role]

            return (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={
                  isActive
                    ? 'rounded-[20px] border border-[#B00100] bg-red-50 px-4 py-1.5 text-sm text-[#B00100]'
                    : 'rounded-[20px] border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100'
                }
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari username, perusahaan, email..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Memuat data user...</p>}

      {isError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error?.message ?? 'Gagal memuat data user.'}
        </p>
      )}

      {!isLoading && !isError && (
        <Card className="py-0">
          <CardContent className="px-0">
            {companies.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                Tidak ada user yang cocok dengan filter ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                      <th className="px-5 py-3">Username</th>
                      <th className="px-5 py-3">Perusahaan</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Telepon</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Terdaftar</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {companies.map((company) => {
                      const isSelf = company.id === currentUser?.id

                      return (
                        <tr key={company.id} className="align-top hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {company.username}
                          </td>
                          <td className="max-w-[180px] px-5 py-3 text-gray-700">
                            <p className="truncate" title={company.company_name}>
                              {company.company_name}
                            </p>
                          </td>
                          <td className="max-w-[200px] px-5 py-3 text-gray-700">
                            <p className="truncate" title={company.email}>
                              {company.email}
                            </p>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                            {company.phone || <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <select
                              value={company.role}
                              disabled={isSelf || updateRoleMutation.isPending}
                              onChange={(event) => handleRoleChange(company, event.target.value)}
                              title={isSelf ? 'Tidak bisa mengubah role sendiri' : undefined}
                              className={selectClassName}
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                            {company.created_at ? formatDate(company.created_at) : '-'}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setResetPasswordTarget(company)}
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#B00100] hover:underline"
                            >
                              <KeyRound size={13} />
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAddAccountOpen && <AddAccountModal onClose={() => setIsAddAccountOpen(false)} />}

      {resetPasswordTarget && (
        <ResetPasswordModal
          targetUser={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
        />
      )}
    </section>
  )
}
