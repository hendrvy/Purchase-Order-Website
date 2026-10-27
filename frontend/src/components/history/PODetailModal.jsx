import { ImageIcon, Loader2, Send, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext.jsx'
import { usePONotesQuery } from '@/hooks/usePONotesQuery.js'
import { useCreatePONoteMutation } from '@/hooks/useCreatePONoteMutation.js'
import { formatDate, formatDateTime } from '@/lib/format.js'
import { PROOF_TYPE_LABELS, getStatusConfig } from '@/lib/status.js'
import { POStatusBadge } from '@/components/history/POStatusBadge.jsx'
import { AttachmentPreviewModal } from '@/components/history/AttachmentPreviewModal.jsx'
import { AttachmentThumbnailList } from '@/components/history/AttachmentThumbnailList.jsx'

/**
 * @import { PurchaseOrder, PONote } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

const MAX_NOTE_LENGTH = 1000

const ROLE_LABELS = {
  user: 'Pemesan',
  validator: 'Validator',
  admin: 'Admin',
  super_admin: 'Admin',
}

/**
 * @param {PONote} note
 * @returns {string}
 */
function authorName(note) {
  const name = note.author?.company_name || note.author?.username
  const role = ROLE_LABELS[note.author_role] ?? note.author_role
  return name ? `${name} (${role})` : role
}

/**
 * Inline reply form under one top-level note.
 *
 * @param {{ poID: number, parentID: number }} props
 */
function ReplyForm({ poID, parentID }) {
  const [message, setMessage] = useState('')
  const mutation = useCreatePONoteMutation()

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    mutation.mutate(
      { id: poID, message: trimmed, parent_id: parentID },
      {
        onSuccess: () => setMessage(''),
        onError: (error) => toast.error(error?.message ?? 'Gagal mengirim balasan.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        placeholder="Tulis balasan..."
        className="min-w-0 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
      />
      <button
        type="submit"
        disabled={mutation.isPending || !message.trim()}
        aria-label="Kirim balasan"
        className="flex items-center gap-1 rounded-md bg-[#B00100] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#B33332] active:bg-[#8f0100] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
      </button>
    </form>
  )
}

/**
 * One reply bubble.
 *
 * @param {{ note: PONote }} props
 */
function ReplyItem({ note }) {
  const isBuyer = note.author_role === 'user'

  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${isBuyer ? 'bg-gray-50' : 'bg-orange-50'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-xs font-medium text-gray-700">{authorName(note)}</span>
        <span className="text-[11px] text-gray-400">{formatDateTime(note.created_at)}</span>
      </div>
      <p className="mt-1 break-words whitespace-pre-wrap text-gray-800">{note.message}</p>
    </div>
  )
}

/**
 * One top-level thread entry (status change / staff note) with its replies.
 *
 * @param {{ note: PONote, replies: PONote[], poID: number, onPreview: (a: Attachment) => void }} props
 */
function NoteThread({ note, replies, poID, onPreview }) {
  const isStatusChange = Boolean(note.status_to)

  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-xs font-medium text-gray-700">{authorName(note)}</span>
        <span className="text-[11px] text-gray-400">{formatDateTime(note.created_at)}</span>
      </div>

      {isStatusChange && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          Mengubah status
          {note.status_from && <POStatusBadge status={note.status_from} />}
          →
          <POStatusBadge status={note.status_to} />
        </p>
      )}

      {note.message ? (
        <p className="mt-2 break-words whitespace-pre-wrap text-sm text-gray-800">
          {note.message}
        </p>
      ) : (
        isStatusChange && <p className="mt-2 text-sm text-gray-400 italic">Tanpa catatan.</p>
      )}

      {note.attachment && (
        <button
          type="button"
          onClick={() => onPreview(note.attachment)}
          className="mt-2 flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50"
        >
          <ImageIcon size={14} className="text-gray-400" />
          <span>
            {PROOF_TYPE_LABELS[note.proof_type] ?? 'Bukti'}
            <span className="ml-1 text-gray-400">({note.attachment.filename})</span>
          </span>
        </button>
      )}

      <div className="mt-3 flex flex-col gap-2 border-l-2 border-gray-100 pl-3">
        {replies.map((reply) => (
          <ReplyItem key={reply.id} note={reply} />
        ))}
        <ReplyForm poID={poID} parentID={note.id} />
      </div>
    </li>
  )
}

/**
 * Detail modal for one purchase order: basic info, attachments, and the
 * forum-style note thread. Staff leave a note on every status change
 * (written in the status dialog); the buyer (and staff) can reply here.
 *
 * @param {{ order: PurchaseOrder | null, onClose: () => void }} props
 */
export function PODetailModal({ order, onClose }) {
  const { user } = useAuth()
  /** @type {[Attachment | null, (a: Attachment | null) => void]} */
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const notesQuery = usePONotesQuery(order?.id)

  if (!order) return null

  const notes = notesQuery.data ?? []
  const topLevel = notes.filter((note) => !note.parent_id)
  const repliesByParent = new Map()
  for (const note of notes) {
    if (!note.parent_id) continue
    if (!repliesByParent.has(note.parent_id)) repliesByParent.set(note.parent_id, [])
    repliesByParent.get(note.parent_id).push(note)
  }

  const showCompany = user?.role !== 'user'

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-gray-900">{order.po_number}</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Diperbarui {formatDate(order.updated_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <POStatusBadge status={order.status} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              {showCompany && (
                <>
                  <dt className="text-gray-400">Perusahaan</dt>
                  <dd className="text-gray-800">{order.company?.company_name || '-'}</dd>
                </>
              )}
              <dt className="text-gray-400">Dibuat</dt>
              <dd className="text-gray-800">{formatDateTime(order.created_at)}</dd>
              <dt className="text-gray-400">Status</dt>
              <dd className="text-gray-800">{getStatusConfig(order.status).label}</dd>
              {order.notes && (
                <>
                  <dt className="text-gray-400">Catatan PO</dt>
                  <dd className="break-words whitespace-pre-wrap text-gray-800">{order.notes}</dd>
                </>
              )}
            </dl>

            {order.attachments?.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-gray-400">File</p>
                <AttachmentThumbnailList
                  attachments={order.attachments}
                  onPreview={setPreviewAttachment}
                />
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Catatan &amp; Diskusi</h3>

              {notesQuery.isLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 size={22} className="animate-spin text-gray-400" />
                </div>
              )}

              {notesQuery.isError && (
                <p className="text-sm text-red-600">
                  {notesQuery.error?.message ?? 'Gagal memuat catatan.'}
                </p>
              )}

              {!notesQuery.isLoading && !notesQuery.isError && topLevel.length === 0 && (
                <p className="text-sm text-gray-400">
                  Belum ada catatan. Catatan muncul saat status PO diubah.
                </p>
              )}

              {topLevel.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {topLevel.map((note) => (
                    <NoteThread
                      key={note.id}
                      note={note}
                      replies={repliesByParent.get(note.id) ?? []}
                      poID={order.id}
                      onPreview={setPreviewAttachment}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </>
  )
}
