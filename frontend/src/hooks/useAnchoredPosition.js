import { useLayoutEffect, useState } from 'react'

// Minimum gap (px) kept between a clamped panel and the viewport edge, so
// it never touches the screen border edge-to-edge on narrow phones.
const VIEWPORT_EDGE_MARGIN = 8

/**
 * Computes the `{ top, left }` viewport-relative position to place a
 * portaled panel (dropdown/popover rendered via `createPortal` into
 * `document.body`) directly below a trigger element, from the trigger's
 * `getBoundingClientRect()`.
 *
 * Portaled panels are used instead of plain `position: absolute` so they
 * can never be clipped by an ancestor's `overflow-hidden`/`overflow-x-auto`
 * (e.g. the History table's scrollable wrapper and Card - see
 * POStatusUpdateControl.jsx and AttachmentThumbnailList.jsx). Since a
 * portaled panel is no longer a DOM descendant of the trigger, its
 * position has to be computed manually instead of relying on a positioned
 * ancestor.
 *
 * `panelWidth` lets the caller pass the panel's known/expected width so
 * the computed `left` can be clamped to stay fully inside the viewport
 * (falling back to right-aligning under the trigger, then clamping to the
 * edge margin) instead of overflowing off-screen. This matters most on
 * mobile, where triggers near the right edge of a narrow card (e.g. the
 * status dropdown in HistoryTable's mobile card view) would otherwise
 * produce a panel wider than the remaining space, pushing the document's
 * scrollable width past the viewport and causing the whole page - including
 * fixed-position elements like the mobile top bar - to shift/zoom
 * slightly on some mobile browsers.
 *
 * @param {boolean} active - Only measures/tracks position while true (e.g. only while the panel is open).
 * @param {import('react').RefObject<HTMLElement>} triggerRef - The element the panel should be anchored below.
 * @param {number} [panelWidth] - Expected rendered width (px) of the panel, used to clamp `left` within the viewport.
 * @returns {{ top: number, left: number } | null} `null` until the first measurement happens (panel should stay unrendered until then, to avoid a flash at the wrong position).
 */
export function useAnchoredPosition(active, triggerRef, panelWidth = 0) {
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    if (!active) {
      setPosition(null)
      return
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      let left = rect.left
      if (panelWidth > 0) {
        const maxLeft = window.innerWidth - panelWidth - VIEWPORT_EDGE_MARGIN
        // Prefer left-aligned under the trigger; if that would overflow
        // the right edge, right-align the panel under the trigger
        // instead; if even that overflows the left edge (very narrow
        // viewport / trigger near the left edge), clamp to the margin.
        left = Math.max(VIEWPORT_EDGE_MARGIN, Math.min(left, maxLeft))
      }

      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      })
    }

    updatePosition()
    // Keep the panel glued to the trigger while an ancestor scrolls
    // (e.g. the table's horizontal overflow-x-auto wrapper) or the
    // window resizes/scrolls. `true` (capture phase) is required to
    // catch scroll events on non-window/document scroll containers,
    // which don't bubble.
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [active, triggerRef, panelWidth])

  return position
}
