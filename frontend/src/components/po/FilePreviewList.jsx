import { FileText, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatFileSize } from '@/lib/format.js'

/**
 * Builds/revokes object URLs for image previews as the file list changes,
 * so we don't leak blob URLs when files are removed or the component
 * unmounts.
 *
 * @param {File[]} files
 * @returns {Map<File, string>}
 */
function useImagePreviews(files) {
  const [previews, setPreviews] = useState(new Map())

  useEffect(() => {
    const nextPreviews = new Map()

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        nextPreviews.set(file, URL.createObjectURL(file))
      }
    }

    setPreviews(nextPreviews)

    return () => {
      for (const url of nextPreviews.values()) {
        URL.revokeObjectURL(url)
      }
    }
    // Only rebuild when the actual file list identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  return previews
}

/**
 * Renders the list of files already picked for a purchase order, with an
 * image thumbnail (or PDF icon), filename, size, and a remove button.
 *
 * @param {{ files: File[], onRemove: (index: number) => void, disabled?: boolean }} props
 */
export function FilePreviewList({ files, onRemove, disabled = false }) {
  const previews = useImagePreviews(files)

  if (files.length === 0) {
    return null
  }

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {files.map((file, index) => {
        const previewUrl = previews.get(file)

        return (
          <li
            key={`${file.name}-${file.lastModified}-${index}`}
            className="relative flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              aria-label={`Hapus ${file.name}`}
              className="absolute top-1 right-1 z-10 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={12} />
            </button>

            <div className="flex h-24 w-full items-center justify-center bg-gray-100">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText size={32} className="text-gray-400" />
              )}
            </div>

            <div className="p-2">
              <p className="truncate text-xs font-medium text-gray-700" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
