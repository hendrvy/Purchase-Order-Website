import { KeyRound, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { SortControl } from '@/components/ui/SortControl.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { formatDate } from '@/lib/format.js'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/types/role.js'
import { useCompaniesQuery } from '@/hooks/useCompaniesQuery.js'
import { useUpdateCompanyRoleMutation } from '@/hooks/useUpdateCompanyRoleMutation.js'
import { usePagination } from '@/hooks/usePagination.js'
import { useSort } from '@/hooks/useSort.js'
import { AddAccountModal } from '@/components/admin/AddAccountModal.jsx'
import { ResetPasswordModal } from '@/components/admin/ResetPasswordModal.jsx'
import { RoleBadge } from '@/components/admin/RoleBadge.jsx'
import { RoleUpdateControl } from '@/components/admin/RoleUpdateControl.jsx'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Tanggal Terdaftar' },
  { value: 'username', label: 'Username' },
  { value: 'company_name', label: 'Perusahaan' },
]

// Defined at module scope so the reference stays stable across renders
// (it's a dependency of the useSort memo - see hooks/useSort.js).
const SORT_ACCESSORS = {
  created_at: (company) =>
    company.created_at ? new Date(company.created_at).getTime() : null,
  username: (company) => company.username,
  company_name: (company) => company.company_name,
}

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
  /** @type {[{ company: object, newRole: string } | null, Function]} */
  const [pendingRoleChange, setPendingRoleChange] = useState(null)

  const {
    data: companies = [],
    isLoading,
    isError,
    error,
  } = useCompaniesQuery({ role: roleFilter, search })

  const updateRoleMutation = useUpdateCompanyRoleMutation()

  const { field, direction, setField, toggleDirection, sortedItems: sortedCompanies } = useSort(
    companies,
    SORT_ACCESSORS,
    { initialField: 'created_at', initialDirection: 'desc' },
  )

  const { page, pageCount, pageItems, totalItems, setPage } = usePagination(
    sortedCompanies,
    PAGE_SIZE,
  )

  // Only stages the change and opens a confirmation dialog - the actual
  // mutation only fires once the admin confirms (see confirmRoleChange
  // below). Without this, picking a new option in the <select> would
  // change a user's access immediately with a single misclick, which is
  // risky for a permission-altering action.
  const handleRoleChange = (company, newRole) => {
    if (newRole === company.role) return
    setPendingRoleChange({ company, newRole })
  }

  const confirmRoleChange = () => {
    if (!pendingRoleChange) return
    const { company, newRole } = pendingRoleChange

    updateRoleMutation.mutate(
      { id: company.id, role: newRole },
      {
        onSuccess: () => {
          toast.success(`Role ${company.username} diubah menjadi ${ROLE_LABELS[newRole]}.`)
          setPendingRoleChange(null)
        },
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

      {!isLoading && !isError && companies.length > 0 && (
        <Card className="py-0">
          <CardContent className="px-0">
            <Pagination
              page={page}
              pageCount={pageCount}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              className="border-t-0"
              sortControl={
                <SortControl
                  value={field}
                  onChange={setField}
                  direction={direction}
                  onToggleDirection={toggleDirection}
                  options={SORT_OPTIONS}
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-gray-400">Memuat data user...</p>}

      {isError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error?.message ?? 'Gagal memuat data user.'}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          {/* Mobile card list (< md) - same rationale as HistoryTable.jsx:
              the table below has a fixed ~1360px width designed for
              desktop columns, so on narrow screens it's replaced entirely
              by a stacked list of cards instead of forcing a horizontal
              scroll. Hidden from `md` up via `md:hidden`. */}
          <div className="flex flex-col gap-3 md:hidden">
            {companies.length === 0 ? (
              <Card>
                <CardContent className="px-5 py-6 text-center text-sm text-gray-400">
                  Tidak ada user yang cocok dengan filter ini.
                </CardContent>
              </Card>
            ) : (
              pageItems.map((company) => {
                const isSelf = company.id === currentUser?.id
                const isSuperAdmin = company.role === 'super_admin'

                return (
                  <Card key={company.id} className="py-0">
                    <CardContent className="flex flex-col gap-3 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{company.username}</p>
                        <p className="mt-0.5 break-words text-sm text-gray-700">
                          {company.company_name}
                        </p>
                      </div>

                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-gray-400">ID</span>
                        <span className="text-right text-gray-700">#{company.id}</span>
                      </div>

                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-gray-400">Email</span>
                        <span className="text-right break-words text-gray-700">
                          {company.email}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-gray-400">Telepon</span>
                        <span className="text-right text-gray-700">{company.phone || '-'}</span>
                      </div>

                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-gray-400">Terdaftar</span>
                        <span className="text-right text-gray-500">
                          {company.created_at ? formatDate(company.created_at) : '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                        <span className="text-xs text-gray-400">Role</span>
                        {isSuperAdmin ? (
                          <RoleBadge
                            role="super_admin"
                            title="Role Super Admin terkunci permanen, tidak bisa diubah siapapun"
                          />
                        ) : (
                          <RoleUpdateControl
                            role={company.role}
                            disabled={isSelf || updateRoleMutation.isPending}
                            disabledTitle={isSelf ? 'Tidak bisa mengubah role sendiri' : undefined}
                            onSelect={(newRole) => handleRoleChange(company, newRole)}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">Aksi</span>
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
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Desktop table (>= md) - unchanged from before. */}
          <Card className="hidden py-0 md:block">
            <CardContent className="px-0">
              {companies.length === 0 ? (
                <div className="w-[1440px] max-w-full px-5 py-6 text-center text-sm text-gray-400">
                  Tidak ada user yang cocok dengan filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Same fixed-width-column approach as HistoryTable.jsx -
                      see the comments there for the full rationale. In
                      short: table-fixed + explicit <colgroup> widths keep
                      every column a consistent width regardless of which
                      row data happens to be visible (filter/search change,
                      long names, etc.), and a fixed `w-[1440px]` (matching
                      the colgroup sum exactly, reused on the empty state
                      above) stops the table/Card from stretching to fill a
                      wider container or shrinking to fit a short "no
                      results" message. Perusahaan/Email wrap onto a second
                      line instead of truncating with '...' once they no
                      longer fit; ID/Username/Telepon/Terdaftar stay
                      single-line since those values are always short in
                      practice. */}
                  <table className="w-[1440px] table-fixed text-left text-sm">
                    <colgroup>
                      <col className="w-20" />
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
                        <th className="px-5 py-3">ID</th>
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
                      {pageItems.map((company) => {
                        const isSelf = company.id === currentUser?.id
                        // super_admin's role/password are permanently locked
                        // - can't be changed by anyone via the app, not even
                        // by another super_admin. See backend RoleSuperAdmin.
                        const isSuperAdmin = company.role === 'super_admin'

                        return (
                          <tr key={company.id} className="align-top hover:bg-gray-50">
                            <td className="overflow-hidden px-5 py-3 text-gray-500">
                              <span
                                className="block w-full min-w-0 truncate"
                                title={`#${company.id}`}
                              >
                                #{company.id}
                              </span>
                            </td>
                            <td className="overflow-hidden px-5 py-3 font-medium text-gray-900">
                              <span
                                className="block w-full min-w-0 truncate"
                                title={company.username}
                              >
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
                              <span
                                className="block w-full min-w-0 truncate"
                                title={company.phone || undefined}
                              >
                                {company.phone || <span className="text-gray-400">-</span>}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {isSuperAdmin ? (
                                <RoleBadge
                                  role="super_admin"
                                  title="Role Super Admin terkunci permanen, tidak bisa diubah siapapun"
                                />
                              ) : (
                                <RoleUpdateControl
                                  role={company.role}
                                  disabled={isSelf || updateRoleMutation.isPending}
                                  disabledTitle={isSelf ? 'Tidak bisa mengubah role sendiri' : undefined}
                                  onSelect={(newRole) => handleRoleChange(company, newRole)}
                                />
                              )}
                            </td>
                            <td className="overflow-hidden px-5 py-3 text-gray-500">
                              <span
                                className="block w-full min-w-0 truncate"
                                title={company.created_at ? formatDate(company.created_at) : undefined}
                              >
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
        </>
      )}

      {isAddAccountOpen && <AddAccountModal onClose={() => setIsAddAccountOpen(false)} />}

      {resetPasswordTarget && (
        <ResetPasswordModal
          targetUser={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
        />
      )}

      {pendingRoleChange && (
        <ConfirmDialog
          title="Ubah Role"
          description={
            <>
              Ubah role <span className="font-medium text-gray-900">{pendingRoleChange.company.username}</span>{' '}
              dari <span className="font-medium text-gray-900">{ROLE_LABELS[pendingRoleChange.company.role]}</span>{' '}
              menjadi{' '}
              <span className="font-medium text-gray-900">
                {ROLE_LABELS[pendingRoleChange.newRole]}
              </span>
              ? Perubahan ini akan langsung berlaku dan memengaruhi hak akses akun tersebut.
            </>
          }
          confirmLabel="Ubah Role"
          isLoading={updateRoleMutation.isPending}
          onConfirm={confirmRoleChange}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
    </section>
  )
}
