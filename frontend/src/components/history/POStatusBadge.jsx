import { getStatusConfig } from "@/lib/status.js"

/**
 * @import { POStatus } from '@/types/po.js'
 */

/**
 * @param {{ status: POStatus }} props
 */
export function POStatusBadge({ status }) {
    const config = getStatusConfig(status)

    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.textClass} ${config.bgClass}`}>
            {config.label}
        </span>
    )
}