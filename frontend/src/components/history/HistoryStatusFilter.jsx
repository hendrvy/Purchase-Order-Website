import { PO_STATUSES } from "@/types/po.js"
import { getStatusConfig } from "@/lib/status.js"

/**
 * @import { POStatus } from '@/types/po.js'
 */

/**
 * Row of pill buttons to filter the History table by status ("Semua" +
 * every PO_STATUSES entry). Purely a controlled UI component - filtering
 * itself happens client-side in HistoryOrderPage.
 *
 * @param {{ value: POStatus | 'all', onChange: (value: POStatus | 'all') => void }} props
 */
export function HistoryStatusFilter({ value, onChange }) {
    const statuses = ['all', ...PO_STATUSES]

    return (
        <div className="flex flex-wrap gap-2">
            {statuses.map((status) => {
                const isActive = value === status
                const label = status === 'all' ? 'Semua' : getStatusConfig(status).label

                return (
                    <button
                        key={status}
                        type="button"
                        onClick={() => onChange(status)}
                        className={
                            isActive
                                ? "rounded-[20px] border border-[#B00100] bg-red-50 px-4 py-1.5 text-sm font-medium text-[#B00100]"
                                : "rounded-[20px] border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                        }
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}
