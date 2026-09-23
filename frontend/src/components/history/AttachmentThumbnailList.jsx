import { FileText, Image as ImageIcon } from 'lucide-react'

/**
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Small row of clickable file icons/thumbnails representing the
 * attachments already uploaded for a purchase order (used in
 * HistoryTable). Clicking one opens the full preview modal via
 * `onPreview`.
 *
 * @param {{ attachments: Attachment[] | undefined, onPreview: (attachment: Attachment) => void }} props
 */
export function AttachmentThumbnailList({ attachments = [], onPreview }) {
  if (!attachments || attachments.length === 0) {
    return <span className="text-xs text-gray-400">Tidak ada file</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attachments.map((attachment) => {
        const isImage = attachment.mime_type?.startsWith('image/')

        return (
          <button
            key={attachment.id}
            type="button"
            onClick={() => onPreview(attachment)}
            title={attachment.filename}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-[#D97745] hover:text-[#D97745]"
          >
            {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
          </button>
        )
      })}
    </div>
  )
}
