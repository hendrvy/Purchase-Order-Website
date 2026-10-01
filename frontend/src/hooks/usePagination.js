import { useMemo, useState } from 'react'

/**
 * Client-side pagination over an already-fetched array. Slices `items`
 * into a single page of `pageSize` entries and exposes the page-change
 * controls needed to render a <Pagination /> component.
 *
 * Clamps the returned `page` (and the slice it produces) down to
 * `pageCount` on every render - rather than resetting state in an effect
 * - so a user never gets stuck looking at an out-of-range/empty page
 * right after the underlying list shrinks (e.g. a status/search filter
 * narrowed it down) below their current page's offset. The *next* time
 * they call `setPage`, it starts counting from that clamped value again.
 *
 * @template T
 * @param {T[]} items
 * @param {number} [pageSize]
 * @returns {{
 *   page: number,
 *   pageCount: number,
 *   pageItems: T[],
 *   totalItems: number,
 *   setPage: (page: number) => void,
 * }}
 */
export function usePagination(items, pageSize = 10) {
  const [requestedPage, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(requestedPage, pageCount)

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  return {
    page,
    pageCount,
    pageItems,
    totalItems: items.length,
    setPage,
  }
}
