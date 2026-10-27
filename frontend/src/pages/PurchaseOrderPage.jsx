import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { FilePreviewList } from '@/components/po/FilePreviewList.jsx'
import { FileUploadZone } from '@/components/po/FileUploadZone.jsx'
import { useCreatePOMutation } from '@/hooks/useCreatePOMutation.js'

const createPOSchema = z.object({
  po_number: z
    .string()
    .trim()
    .min(1, 'No. PO wajib diisi.')
    .max(50, 'Maksimal 50 karakter.'),
  notes: z.string().trim().max(255, 'Catatan maksimal 255 karakter.').optional(),
})

export function PurchaseOrderPage() {
  const navigate = useNavigate()
  const mutation = useCreatePOMutation()

  const [files, setFiles] = useState([])
  const [filesError, setFilesError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPOSchema),
    defaultValues: { po_number: '', notes: '' },
  })

  const notes = watch("notes")

  const autoResize = (event) => {
    event.target.style.height = "auto"
    event.target.style.height = `${event.target.scrollHeight}px`
  }

  const handleFilesAdded = (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles])
    setFilesError(null)
  }

  const handleFilesRejected = (rejected) => {
    const reasons = [...new Set(rejected.map((item) => item.reason))]
    setFilesError(reasons.join(' '))
  }

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (values) => {
    if (files.length === 0) {
      setFilesError('Lampirkan minimal satu file (gambar atau PDF).')
      return
    }

    mutation.mutate(
      { ...values, attachments: files },
      {
        onSuccess: (order) => {
          toast.success(`Purchase order ${order.po_number} berhasil dibuat.`)
          reset()
          setFiles([])
          navigate('/history')
        },
        onError: (error) => {
          toast.error(error?.message ?? 'Gagal membuat purchase order.')
        },
      },
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Purchase Order</h1>
      <p className="mt-1 text-sm text-gray-400">Buat purchase order baru di bawah ini.</p>

      <div>
        <Card className="mt-6 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Purchase Order</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* No. PO */}
            <div>
              <label htmlFor="po_number" className="block text-sm font-medium text-gray-700">
                No. PO
              </label>
              <input
                id="po_number"
                type="text"
                maxLength={50}
                placeholder="Contoh: PO-2026-0001"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
                {...register('po_number')}
              />
              {errors.po_number && (
                <p className="mt-1 text-xs text-red-600">{errors.po_number.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Catatan <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                maxLength={255}
                placeholder="Tambahkan catatan atau keterangan tambahan..."
                className="mt-1 w-full resize-none overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
                {...register('notes')}
                onInput={autoResize}
              />
              <p className="text-right text-xs">{notes?.length ?? 0}/255</p>
              {errors.notes && (
                <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lampiran (Gambar / PDF)
              </label>

              <div className="mt-1">
                {files.length === 0 ? (
                  <FileUploadZone
                    variant="dropzone"
                    files={files}
                    onFilesAdded={handleFilesAdded}
                    onRejected={handleFilesRejected}
                    disabled={mutation.isPending}
                  />
                ) : (
                  <>
                    <FilePreviewList
                      files={files}
                      onRemove={handleRemoveFile}
                      disabled={mutation.isPending}
                    />
                    <FileUploadZone
                      variant="button"
                      files={files}
                      onFilesAdded={handleFilesAdded}
                      onRejected={handleFilesRejected}
                      disabled={mutation.isPending}
                    />
                  </>
                )}
              </div>

              {filesError && <p className="mt-1 text-xs text-red-600">{filesError}</p>}
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={mutation.isPending}>
                Buat Purchase Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
