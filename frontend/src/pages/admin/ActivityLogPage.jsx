import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { formatDateTime } from '@/lib/format.js'
import { usePagination } from '@/hooks/usePagination.js'
import {
  useDownloadLogsQuery,
  usePasswordChangeLogsQuery,
  useProfileChangeLogsQuery,
} from '@/hooks/useAuditLogsQuery.js'

const PAGE_SIZE = 10

const TABS = [
  { key: 'profile', label: 'Perubahan Profil' },
  { key: 'password', label: 'Perubahan Password' },
  { key: 'downloads', label: 'Unduhan File' },
]

const FIELD_LABELS = {
  username: 'Username',
  email: 'Email',
  phone: 'Telepon',
  company_name: 'Nama Perusahaan',
  role: 'Role',
}

function ProfileChangeTable() {
  const { data: logs = [], isLoading, isError, error } = useProfileChangeLogsQuery()

  if (isLoading) return <p className="px-5 py-6 text-sm text-gray-400">Memuat log...</p>
  if (isError) {
    return (
      <p className="px-5 py-6 text-sm text-red-600">
        {error?.message ?? 'Gagal memuat log perubahan profil.'}
      </p>
    )
  }
  if (logs.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-gray-400">Belum ada aktivitas.</p>
  }

  return <ProfileChangeTableBody logs={logs} />
}

function ProfileChangeTableBody({ logs }) {
  const { page, pageCount, pageItems, totalItems, setPage } = usePagination(logs, PAGE_SIZE)

  return (
    <>
      {/* Mobile card list (< md) - see HistoryTable.jsx for the general
          rationale of swapping wide tables for stacked cards below md. */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {pageItems.map((log) => (
          <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-gray-900">#{log.user_id}</span>
              <span className="text-xs text-gray-500">{formatDateTime(log.changed_at)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {FIELD_LABELS[log.field_name] ?? log.field_name}
            </p>
            <div className="mt-2 flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0 break-words text-gray-500">
                {log.old_value || '-'}
              </span>
              <span className="text-gray-400">&rarr;</span>
              <span className="min-w-0 break-words text-right text-gray-900">
                {log.new_value || '-'}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">IP: {log.ip_address || '-'}</p>
          </div>
        ))}
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="border-t-0 px-0"
        />
      </div>

      {/* Desktop table (>= md). table-fixed + percentage <colgroup> keeps
          every column a stable proportion of the table regardless of
          cell content, same rationale as HistoryTable.jsx. */}
      <div className="hidden py-0 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
              <th className="px-5 py-3">User ID</th>
              <th className="px-5 py-3">Field</th>
              <th className="px-5 py-3">Sebelum</th>
              <th className="px-5 py-3">Sesudah</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((log) => (
              <tr key={log.id} className="align-top hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    #{log.user_id}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    {FIELD_LABELS[log.field_name] ?? log.field_name}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {log.old_value || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-900">
                  <span className="block w-full break-words whitespace-normal">
                    {log.new_value || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {log.ip_address || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {formatDateTime(log.changed_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  )
}

function PasswordChangeTable() {
  const { data: logs = [], isLoading, isError, error } = usePasswordChangeLogsQuery()

  if (isLoading) return <p className="px-5 py-6 text-sm text-gray-400">Memuat log...</p>
  if (isError) {
    return (
      <p className="px-5 py-6 text-sm text-red-600">
        {error?.message ?? 'Gagal memuat log perubahan password.'}
      </p>
    )
  }
  if (logs.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-gray-400">Belum ada aktivitas.</p>
  }

  return <PasswordChangeTableBody logs={logs} />
}

function PasswordChangeTableBody({ logs }) {
  const { page, pageCount, pageItems, totalItems, setPage } = usePagination(logs, PAGE_SIZE)

  return (
    <>
      {/* Mobile card list (< md) - see HistoryTable.jsx for the general
          rationale of swapping wide tables for stacked cards below md. */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {pageItems.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">#{log.user_id}</p>
              <p className="text-xs text-gray-400">IP: {log.ip_address || '-'}</p>
            </div>
            <span className="text-xs text-gray-500">{formatDateTime(log.changed_at)}</span>
          </div>
        ))}
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="border-t-0 px-0"
        />
      </div>

      {/* Desktop table (>= md). table-fixed + percentage <colgroup> keeps
          every column a stable proportion of the table regardless of
          cell content, same rationale as HistoryTable.jsx. */}
      <div className="hidden py-0 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[35%]" />
            <col className="w-[35%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
              <th className="px-5 py-3">User ID</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((log) => (
              <tr key={log.id} className="align-top hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    #{log.user_id}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {log.ip_address || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {formatDateTime(log.changed_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  )
}

function DownloadLogTable() {
  const { data: logs = [], isLoading, isError, error } = useDownloadLogsQuery()

  if (isLoading) return <p className="px-5 py-6 text-sm text-gray-400">Memuat log...</p>
  if (isError) {
    return (
      <p className="px-5 py-6 text-sm text-red-600">
        {error?.message ?? 'Gagal memuat log unduhan.'}
      </p>
    )
  }
  if (logs.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-gray-400">Belum ada aktivitas.</p>
  }

  return <DownloadLogTableBody logs={logs} />
}

function DownloadLogTableBody({ logs }) {
  const { page, pageCount, pageItems, totalItems, setPage } = usePagination(logs, PAGE_SIZE)

  return (
    <>
      {/* Mobile card list (< md) - see HistoryTable.jsx for the general
          rationale of swapping wide tables for stacked cards below md. */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {pageItems.map((log) => (
          <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-gray-900">PO #{log.po_id}</span>
              <span className="text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              User #{log.user_id} &middot; Attachment #{log.attachment_id}
            </p>
            <p className="mt-1 text-xs text-gray-400">IP: {log.ip_address || '-'}</p>
          </div>
        ))}
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="border-t-0 px-0"
        />
      </div>

      {/* Desktop table (>= md). table-fixed + percentage <colgroup> keeps
          every column a stable proportion of the table regardless of
          cell content, same rationale as HistoryTable.jsx. */}
      <div className="hidden py-0 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
              <th className="px-5 py-3">User ID</th>
              <th className="px-5 py-3">PO ID</th>
              <th className="px-5 py-3">Attachment ID</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((log) => (
              <tr key={log.id} className="align-top hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    #{log.user_id}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    #{log.po_id}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  <span className="block w-full break-words whitespace-normal">
                    #{log.attachment_id}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {log.ip_address || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="block w-full break-words whitespace-normal">
                    {formatDateTime(log.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  )
}

/**
 * Admin-only page: browse audit trails for profile changes, password
 * resets, and attachment downloads. Reads tables that already existed in
 * the schema (ProfileChange/PasswordChange/DownloadLog) but had no UI
 * before (see backend/api/admin_handlers.go Admin*Logs handlers).
 */
export function ActivityLogPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat perubahan profil, password, dan unduhan file lampiran di seluruh akun.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                isActive
                  ? 'rounded-[20px] border border-[#B00100] bg-red-50 px-4 py-1.5 text-sm text-[#B00100]'
                  : 'rounded-[20px] border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100'
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {activeTab === 'profile' && <ProfileChangeTable />}
          {activeTab === 'password' && <PasswordChangeTable />}
          {activeTab === 'downloads' && <DownloadLogTable />}
        </CardContent>
      </Card>
    </section>
  )
}
