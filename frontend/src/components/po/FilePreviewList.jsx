import { FileText, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const [previewFile, setPreviewFile] = useState(null)
  const isPreviewingImage = previewFile?.type.startsWith('image/') ?? false

  // Images already have an object URL from useImagePreviews (and its own
  // revocation logic), so only build/revoke a separate URL for non-image
  // previews (e.g. PDFs) here.
  const nonImagePreviewUrl = useMemo(
    () => (previewFile && !isPreviewingImage ? URL.createObjectURL(previewFile) : null),
    [previewFile, isPreviewingImage],
  )

  useEffect(() => {
    return () => {
      if (nonImagePreviewUrl) {
        URL.revokeObjectURL(nonImagePreviewUrl)
      }
    }
  }, [nonImagePreviewUrl])

  const previewUrl = isPreviewingImage ? previews.get(previewFile) : nonImagePreviewUrl

  if (files.length === 0) {
    return null
  }

  return (
    <>
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className='truncate text-sm font-medium text-gray-800'>
                {previewFile.name}
              </p>

              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className='rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black'
              >
                <X size={18} />
              </button>
            </div>

            {previewUrl && (
              isPreviewingImage ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  className='h-full w-full rounded-b-xl object-contain'
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  className='h-full w-full rounded-b-xl'
                />
              )
            )}
          </div>
        </div>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((file, index) => {
          const thumbnailUrl = previews.get(file)

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

              <div
                className="flex h-24 w-full cursor-pointer items-center justify-center bg-gray-100"
                onClick={() => setPreviewFile(file)}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
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
    </>
  )
}
