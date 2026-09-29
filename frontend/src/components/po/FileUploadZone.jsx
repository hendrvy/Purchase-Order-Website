import { Plus, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { FILE_INPUT_ACCEPT, MAX_FILES, validateFiles } from '@/lib/upload-constraints.js'

/**
 * Drag-and-drop + click-to-browse zone for adding purchase order
 * attachments (images/PDF). Supports appending more files after an
 * initial batch has already been added - it never replaces the existing
 * selection, only adds to it (dedup/limits handled by validateFiles).
 *
 * `variant="dropzone"` renders the large empty-state drop area (used
 * before any file is picked). `variant="button"` renders a compact
 * "add more files" affordance (used once at least one file is already
 * attached, so the large dropzone doesn't compete with the preview grid).
 *
 * @param {{
 *   files: File[],
 *   onFilesAdded: (files: File[]) => void,
 *   onRejected?: (rejected: Array<{ file: File, reason: string }>) => void,
 *   disabled?: boolean,
 *   variant?: 'dropzone' | 'button',
 * }} props
 */
export function FileUploadZone({
  files,
  onFilesAdded,
  onRejected,
  disabled = false,
  variant = 'dropzone',
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const remainingSlots = MAX_FILES - files.length
  const isFull = remainingSlots <= 0

  const handleIncomingFiles = (fileList) => {
    if (disabled) return

    const incoming = Array.from(fileList)
    const { accepted, rejected } = validateFiles(incoming, files)

    if (accepted.length > 0) {
      onFilesAdded(accepted)
    }
    if (rejected.length > 0) {
      onRejected?.(rejected)
    }
  }

  const handleInputChange = (event) => {
    if (event.target.files) {
      handleIncomingFiles(event.target.files)
    }
    // Reset so selecting the same file again still fires onChange.
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    if (disabled || isFull) return
    if (event.dataTransfer.files) {
      handleIncomingFiles(event.dataTransfer.files)
    }
  }

  const fileInput = (
    <input
      id={inputId}
      ref={inputRef}
      type="file"
      multiple
      accept={FILE_INPUT_ACCEPT}
      className="sr-only"
      onChange={handleInputChange}
      disabled={disabled || isFull}
    />
  )

  if (variant === 'button') {
    return (
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !isFull) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          mt-3 flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-2 text-sm font-medium transition
          ${isDragOver ? 'border-[#D97745] bg-[#D97745]/5 text-[#D97745]' : 'border-gray-300 text-gray-600'}
          ${disabled || isFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#D97745] hover:bg-[#D97745]/5 hover:text-[#D97745]'}
        `}
      >
        <Plus size={16} />
        {isFull ? 'Batas jumlah file tercapai' : 'Tambah File Lain'}
        {fileInput}
      </label>
    )
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !isFull) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition
          ${isDragOver ? 'border-[#D97745] bg-[#D97745]/5' : 'border-gray-300 bg-gray-50'}
          ${disabled || isFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#D97745] hover:bg-[#D97745]/5'}
        `}
      >
        <Upload size={28} className="text-gray-400" />

        <p className="text-sm font-medium text-gray-700">
          {isFull ? 'Batas jumlah file tercapai' : 'Klik atau seret file ke sini'}
        </p>

        <p className="text-xs text-gray-400">
          Gambar atau PDF, maks. 5 MB per file &middot; maks. {MAX_FILES} file
          {files.length > 0 && !isFull && ` (${remainingSlots} slot tersisa)`}
        </p>

        {fileInput}
      </label>
    </div>
  )
}
