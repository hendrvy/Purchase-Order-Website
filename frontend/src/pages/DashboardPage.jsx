import { useAuth } from '@/context/AuthContext.jsx'
import { ROLE_LABELS } from '@/types/role.js'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Selamat datang, <span className="font-medium">{user?.full_name}</span> (
        {ROLE_LABELS[user?.role]}).
      </p>
      <p className="mt-1 text-sm text-gray-400">
        Konten dashboard akan ditambahkan pada fase berikutnya.
      </p>
    </div>
  )
}
