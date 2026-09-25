import { KeyRound, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { formatDate } from '@/lib/format.js'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/types/role.js'
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
          {['all', ...ASSIGNABLE_ROLES].map((role) => {
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
              <div className="w-[1360px] max-w-full px-5 py-6 text-center text-sm text-gray-400">
                Tidak ada user yang cocok dengan filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Same fixed-width-column approach as HistoryTable.jsx -
                    see the comments there for the full rationale. In
                    short: table-fixed + explicit <colgroup> widths keep
                    every column a consistent width regardless of which
                    row data happens to be visible (filter/search change,
                    long names, etc.), and a fixed `w-[1360px]` (matching
                    the colgroup sum exactly, reused on the empty state
                    above) stops the table/Card from stretching to fill a
                    wider container or shrinking to fit a short "no
                    results" message. Perusahaan/Email wrap onto a second
                    line instead of truncating with '...' once they no
                    longer fit; Username/Telepon/Terdaftar stay single-line
                    since those values are always short in practice. */}
                <table className="w-[1360px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-40" />
                    <col className="w-64" />
                    <col className="w-72" />
                    <col className="w-40" />
                    <col className="w-44" />
                    <col className="w-36" />
                    <col className="w-44" />
                  </colgroup>
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
                      // super_admin's role/password are permanently locked
                      // - can't be changed by anyone via the app, not even
                      // by another super_admin. See backend RoleSuperAdmin.
                      const isSuperAdmin = company.role === 'super_admin'

                      return (
                        <tr key={company.id} className="align-top hover:bg-gray-50">
                          <td className="overflow-hidden px-5 py-3 font-medium text-gray-900">
                            <span className="block w-full min-w-0 truncate">
                              {company.username}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            <span className="block w-full break-words whitespace-normal">
                              {company.company_name}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            <span className="block w-full break-words whitespace-normal">
                              {company.email}
                            </span>
                          </td>
                          <td className="overflow-hidden px-5 py-3 text-gray-700">
                            <span className="block w-full min-w-0 truncate">
                              {company.phone || <span className="text-gray-400">-</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {isSuperAdmin ? (
                              <span
                                className="inline-flex items-center rounded-[20px] border border-[#B00100] bg-red-50 px-3 py-1 text-xs font-medium text-[#B00100]"
                                title="Role Super Admin terkunci permanen, tidak bisa diubah siapapun"
                              >
                                {ROLE_LABELS.super_admin}
                              </span>
                            ) : (
                              <select
                                value={company.role}
                                disabled={isSelf || updateRoleMutation.isPending}
                                onChange={(event) => handleRoleChange(company, event.target.value)}
                                title={isSelf ? 'Tidak bisa mengubah role sendiri' : undefined}
                                className={selectClassName}
                              >
                                {ASSIGNABLE_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="overflow-hidden px-5 py-3 text-gray-500">
                            <span className="block w-full min-w-0 truncate">
                              {company.created_at ? formatDate(company.created_at) : '-'}
                            </span>
                          </td>
                          <td className="overflow-hidden px-5 py-3">
                            {isSuperAdmin ? (
                              <span
                                className="text-xs text-gray-400"
                                title="Password Super Admin hanya bisa diubah oleh akun itu sendiri lewat halaman Profile"
                              >
                                -
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setResetPasswordTarget(company)}
                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#B00100] hover:underline"
                              >
                                <KeyRound size={13} />
                                Reset Password
                              </button>
                            )}
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
