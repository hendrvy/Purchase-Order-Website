import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { formatDateTime } from '@/lib/format.js'
import {
  useDownloadLogsQuery,
  usePasswordChangeLogsQuery,
  useProfileChangeLogsQuery,
} from '@/hooks/useAuditLogsQuery.js'

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
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
          {logs.map((log) => (
            <tr key={log.id} className="align-top hover:bg-gray-50">
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">#{log.user_id}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                {FIELD_LABELS[log.field_name] ?? log.field_name}
              </td>
              <td className="max-w-[180px] px-5 py-3 text-gray-500">
                <p className="truncate">{log.old_value || '-'}</p>
              </td>
              <td className="max-w-[180px] px-5 py-3 text-gray-900">
                <p className="truncate">{log.new_value || '-'}</p>
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">{log.ip_address || '-'}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                {formatDateTime(log.changed_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
            <th className="px-5 py-3">User ID</th>
            <th className="px-5 py-3">IP</th>
            <th className="px-5 py-3">Waktu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => (
            <tr key={log.id} className="align-top hover:bg-gray-50">
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">#{log.user_id}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">{log.ip_address || '-'}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                {formatDateTime(log.changed_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
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
          {logs.map((log) => (
            <tr key={log.id} className="align-top hover:bg-gray-50">
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">#{log.user_id}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">#{log.po_id}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-700">#{log.attachment_id}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">{log.ip_address || '-'}</td>
              <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                {formatDateTime(log.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
