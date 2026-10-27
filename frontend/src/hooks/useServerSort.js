import { useState } from 'react'

/**
 * Holds the sort field + direction state for a server-side sorted list.
 * This does NOT sort anything - it only tracks the `?sort=`/`?order=` values
 * a query should send, so it pairs with <SortControl /> and a paginated API
 * response.
 *
 * @param {string} initialField
 * @param {'asc' | 'desc'} [initialOrder]
 * @returns {{
 *   sort: string,
 *   order: 'asc' | 'desc',
 *   setSort: (field: string) => void,
 *   toggleOrder: () => void,
 * }}
 */
export function useServerSort(initialField, initialOrder = 'desc') {
  const [sort, setSort] = useState(initialField)
  const [order, setOrder] = useState(initialOrder)

  function toggleOrder() {
    setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  return { sort, order, setSort, toggleOrder }
}
