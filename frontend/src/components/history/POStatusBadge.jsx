import { getStatusConfig } from "@/lib/status.js"

/**
 * @import { POStatus } from '@/types/po.js'
 */

/**
 * @param {{ status: POStatus }} props
 */
export function POStatusBadge({ status }) {
    const config = getStatusConfig(status)

    // Fixed width (rather than letting each pill hug its own label) so all
    // status badges line up to the same size regardless of label length
    // ("Shipping" vs "Processing") - keeps the Status column in
    // HistoryTable and the dropdown trigger in POStatusUpdateControl
    // looking tidy/aligned instead of jagged.
    return (
        <span
            className={`inline-flex w-[88px] items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-medium ${config.textClass} ${config.bgClass}`}
        >
            {config.label}
        </span>
    )
}