import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils.js'

/**
 * Builds the list of page numbers/ellipses to render, always keeping the
 * first page, the last page, and a window of `siblingCount` pages around
 * the current page visible - e.g. for page=5, pageCount=10,
 * siblingCount=1: [1, '...', 4, 5, 6, '...', 10]. Returns a plain range
 * (no ellipses) when the whole thing already fits without collapsing.
 *
 * @param {number} page
 * @param {number} pageCount
 * @param {number} siblingCount
 * @returns {Array<number | 'start-ellipsis' | 'end-ellipsis'>}
 */
function getPageRange(page, pageCount, siblingCount) {
  const totalVisible = siblingCount * 2 + 5 // first + last + current + 2 siblings + 2 ellipses worst case

  if (pageCount <= totalVisible) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }

  const start = Math.max(2, page - siblingCount)
  const end = Math.min(pageCount - 1, page + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('start-ellipsis')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < pageCount - 1) pages.push('end-ellipsis')
  pages.push(pageCount)

  return pages
}

/**
 * Pagination controls for tables that slice a client-side list (see
 * hooks/usePagination.js). Shows "Menampilkan X-Y dari Z" alongside
 * prev/next + numbered page buttons. Renders nothing when there's only
 * one page, since controls would be pointless with nothing to paginate
 * to.
 *
 * @param {{
 *   page: number,
 *   pageCount: number,
 *   totalItems: number,
 *   pageSize: number,
 *   onPageChange: (page: number) => void,
 *   className?: string,
 * }} props
 */
export function Pagination({ page, pageCount, totalItems, pageSize, onPageChange, className }) {
  if (pageCount <= 1) return null

  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalItems)
  const pages = getPageRange(page, pageCount, 1)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row',
        className,
      )}
    >
      <p className="text-xs text-gray-500">
        Menampilkan {rangeStart}-{rangeEnd} dari {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p) =>
          typeof p === 'number' ? (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={
                p === page
                  ? 'flex h-8 w-8 items-center justify-center rounded-md border border-[#B00100] bg-red-50 text-sm text-[#B00100]'
                  : 'flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-sm text-gray-600 transition hover:bg-gray-100'
              }
            >
              {p}
            </button>
          ) : (
            <span key={p} className="flex h-8 w-8 items-center justify-center text-sm text-gray-400">
              &hellip;
            </span>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Halaman berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
