import { useEffect } from 'react'

/**
 * Calls `onOutsideClick` when a mousedown happens outside every ref in
 * `refs` - used to close portal-based dropdowns/popovers (see
 * POStatusUpdateControl.jsx, AttachmentThumbnailList.jsx) whose trigger
 * button and panel are two separate DOM subtrees (the panel is rendered
 * via `createPortal` into `document.body`, so it isn't a descendant of the
 * trigger and a single ref/containerRef.contains() check wouldn't cover
 * clicks inside the panel itself).
 *
 * @param {boolean} active - Only attaches the listener while true (e.g. only while a menu is open), so it doesn't run on every render.
 * @param {Array<import('react').RefObject<HTMLElement>>} refs - Elements considered "inside" - a click on any of them (or their descendants) does NOT count as outside.
 * @param {() => void} onOutsideClick
 */
export function useClickOutside(active, refs, onOutsideClick) {
  useEffect(() => {
    if (!active) return

    function handleMouseDown(event) {
      const clickedInside = refs.some((ref) => ref.current?.contains(event.target))
      if (!clickedInside) onOutsideClick()
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
    // `refs` is expected to be a stable array of ref objects, not
    // re-created per render, so only `active` needs to re-trigger this.
  }, [active])
}
