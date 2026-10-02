import { useMemo, useState } from 'react'

/**
 * Client-side sorting state over an already-fetched array. Pairs with the
 * <SortControl /> dropdown + direction toggle (components/ui/SortControl.jsx)
 * and is applied before client-side pagination (hooks/usePagination.js), so
 * the page slice always reflects the chosen order.
 *
 * `accessors` maps each sortable field key to a function that pulls the
 * value to compare from an item. Callers should define this map (and the
 * matching `options` labels) at module scope so its reference stays stable
 * across renders - it is a `useMemo` dependency.
 *
 * Dates compare numerically (new Date(...).getTime()), numbers numerically,
 * and everything else as locale-aware strings. Null/undefined values always
 * sort to the end, regardless of direction, so e.g. POs without a company
 * or logs without an IP don't jump to the top when ascending.
 *
 * @template T
 * @param {T[]} items
 * @param {Record<string, (item: T) => string | number | null | undefined>} accessors
 * @param {{ initialField?: string, initialDirection?: 'asc' | 'desc' }} [options]
 * @returns {{
 *   field: string,
 *   direction: 'asc' | 'desc',
 *   setField: (field: string) => void,
 *   setDirection: (direction: 'asc' | 'desc') => void,
 *   toggleDirection: () => void,
 *   sortedItems: T[],
 * }}
 */
export function useSort(items, accessors, options = {}) {
  const { initialField, initialDirection = 'desc' } = options

  const [field, setField] = useState(initialField ?? Object.keys(accessors)[0])
  const [direction, setDirection] = useState(initialDirection)

  const sortedItems = useMemo(() => {
    const getValue = accessors[field]
    if (!getValue) return items

    const factor = direction === 'asc' ? 1 : -1

    return [...items].sort((a, b) => {
      const aValue = getValue(a)
      const bValue = getValue(b)

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * factor
      }

      return String(aValue).localeCompare(String(bValue), 'id', { sensitivity: 'base' }) * factor
    })
  }, [items, accessors, field, direction])

  function toggleDirection() {
    setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  return { field, direction, setField, setDirection, toggleDirection, sortedItems }
}
