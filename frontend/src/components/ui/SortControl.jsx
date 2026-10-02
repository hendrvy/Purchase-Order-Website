import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils.js'

/**
 * Controlled sort UI: a dropdown to pick the field to sort by plus a
 * separate toggle button that flips between ascending and descending.
 * Purely presentational - the caller owns the `value`/`direction` state and
 * sends them to the server (see hooks/useServerSort.js), which does the
 * actual sorting.
 *
 * @param {{
 *   value: string,
 *   onChange: (value: string) => void,
 *   direction: 'asc' | 'desc',
 *   onToggleDirection: () => void,
 *   options: Array<{ value: string, label: string }>,
 *   className?: string,
 * }} props
 */
export function SortControl({
  value,
  onChange,
  direction,
  onToggleDirection,
  options,
  className,
}) {
  const isAscending = direction === 'asc'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="hidden text-xs text-gray-400 sm:inline">Urutkan</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Urutkan berdasarkan"
        className="h-8 rounded-md border border-gray-300 bg-white pr-6 pl-2 text-xs text-gray-700 focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onToggleDirection}
        aria-label={isAscending ? 'Urutan menaik' : 'Urutan menurun'}
        title={isAscending ? 'Menaik' : 'Menurun'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-100"
      >
        {isAscending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
      </button>
    </div>
  )
}
