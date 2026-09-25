import { useLayoutEffect, useState } from 'react'

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
 * @param {boolean} active - Only measures/tracks position while true (e.g. only while the panel is open).
 * @param {import('react').RefObject<HTMLElement>} triggerRef - The element the panel should be anchored below.
 * @returns {{ top: number, left: number } | null} `null` until the first measurement happens (panel should stay unrendered until then, to avoid a flash at the wrong position).
 */
export function useAnchoredPosition(active, triggerRef) {
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    if (!active) {
      setPosition(null)
      return
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
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
  }, [active, triggerRef])

  return position
}
