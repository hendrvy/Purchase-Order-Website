import { FileText, Image as ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition.js'
import { useClickOutside } from '@/hooks/useClickOutside.js'

/**
 * @import { Attachment } from '@/types/attachment.js'
 */

// A PO can have up to 10 attachments (MAX_FILES, kept in sync with the
// backend's MaxAttachmentsPerPO - see lib/upload-constraints.js). Rendering
// all of them as full-width chips stacked vertically with no cap (the
// original design) made that row up to ~6x taller than a normal row,
// breaking the table's flat look. Instead, only the first few render
// inline (still as icon + filename chips, so the name stays visible
// without needing to hover); the rest sit behind a "+N" chip that opens a
// popover with the full list - so a row's height is bounded regardless of
// how many files it has.
const MAX_VISIBLE_CHIPS = 3

/**
 * Compact, height-bounded list of clickable file chips (icon + filename)
 * representing the attachments already uploaded for a purchase order (used
 * in HistoryTable). Clicking a chip opens the full preview modal via
 * `onPreview`. When there are more than `MAX_VISIBLE_CHIPS` attachments,
 * the rest are tucked behind a "+N lainnya" chip that opens a scrollable
 * popover listing every remaining file.
 *
 * @param {{ attachments: Attachment[] | undefined, onPreview: (attachment: Attachment) => void }} props
 */
export function AttachmentThumbnailList({ attachments = [], onPreview }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const moreTriggerRef = useRef(null)
  const morePanelRef = useRef(null)

  useClickOutside(isMoreOpen, [moreTriggerRef, morePanelRef], () => setIsMoreOpen(false))
  const panelPosition = useAnchoredPosition(isMoreOpen, moreTriggerRef)

  if (!attachments || attachments.length === 0) {
    return <span className="text-xs text-gray-400">Tidak ada file</span>
  }

  const visible = attachments.slice(0, MAX_VISIBLE_CHIPS)
  const hiddenCount = attachments.length - visible.length

  function handlePreview(attachment) {
    setIsMoreOpen(false)
    onPreview(attachment)
  }

  return (
    <div className="flex w-full flex-col items-start gap-1">
      {visible.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onClick={() => handlePreview(attachment)}
        />
      ))}

      {hiddenCount > 0 && (
        <button
          ref={moreTriggerRef}
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          className="flex w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-[#B00100] hover:text-[#B00100]"
        >
          +{hiddenCount} lainnya
        </button>
      )}

      {isMoreOpen &&
        panelPosition &&
        createPortal(
          <div
            ref={morePanelRef}
            style={{ position: 'absolute', top: panelPosition.top, left: panelPosition.left }}
            className="z-50 flex max-h-80 w-64 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          >
            <p className="px-1 pb-1 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
              Semua file ({attachments.length})
            </p>
            {attachments.map((attachment) => (
              <AttachmentChip
                key={attachment.id}
                attachment={attachment}
                onClick={() => handlePreview(attachment)}
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

/** @param {{ attachment: Attachment }} props */
function AttachmentTypeIcon({ attachment }) {
  const isImage = attachment.mime_type?.startsWith('image/')
  return isImage ? (
    <ImageIcon size={14} className="flex-shrink-0" />
  ) : (
    <FileText size={14} className="flex-shrink-0" />
  )
}

/**
 * A single file chip (icon + truncated filename) - shared by the inline
 * visible list and the "+N" overflow popover so both look identical.
 *
 * @param {{ attachment: Attachment, onClick: () => void }} props
 */
function AttachmentChip({ attachment, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={attachment.filename}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 transition hover:border-[#B00100] hover:text-[#B00100]"
    >
      <AttachmentTypeIcon attachment={attachment} />
      {/* min-w-0 is required for truncate to work on a flex item - flex
          children default to min-width:auto, which lets them refuse to
          shrink below the filename's full intrinsic width, silently
          defeating `truncate`. */}
      <span className="min-w-0 flex-1 truncate text-xs">{attachment.filename}</span>
    </button>
  )
}
