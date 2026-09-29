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
  title: z
    .string()
    .trim()
    .min(1, 'Nama/judul purchase order wajib diisi.')
    .max(150, 'Maksimal 150 karakter.'),
  total_amount: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : Number(value)),
    z
      .number({ invalid_type_error: 'Nominal wajib diisi.' })
      .positive('Nominal harus lebih besar dari 0.'),
  ),
  notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter.').optional(),
})

/**
 * Formats a raw number as grouped digits without a currency symbol, e.g.
 * 1500000 -> "1.500.000", used for the live nominal input display.
 *
 * @param {number | undefined} value
 * @returns {string}
 */
function formatNominalDisplay(value) {
  if (value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('id-ID').format(value)
}

export function PurchaseOrderPage() {
  const navigate = useNavigate()
  const mutation = useCreatePOMutation()

  const [files, setFiles] = useState([])
  const [filesError, setFilesError] = useState(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPOSchema),
    defaultValues: { title: '', total_amount: undefined, notes: '' },
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
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Nama / Judul Purchase Order
              </label>
              <input
                id="title"
                type="text"
                placeholder="Contoh: ATK Kantor Bulan September"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
                {...register('title')}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Nominal */}
            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700">
                Nominal
              </label>
              <Controller
                control={control}
                name="total_amount"
                render={({ field }) => (
                  <div className="mt-1 flex items-center rounded-md border border-gray-300 bg-white px-3 focus-within:border-[#D97745] focus-within:ring-1 focus-within:ring-[#D97745]">
                    <span className="pr-1 text-sm text-gray-500">Rp</span>
                    <input
                      id="total_amount"
                      inputMode="numeric"
                      type="text"
                      placeholder="0"
                      className="w-full bg-transparent py-2 text-sm focus:outline-none"
                      value={formatNominalDisplay(field.value)}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '')
                        field.onChange(digits ? Number(digits) : undefined)
                      }}
                      onBlur={field.onBlur}
                    />
                  </div>
                )}
              />
              {errors.total_amount && (
                <p className="mt-1 text-xs text-red-600">{errors.total_amount.message}</p>
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
                maxLength={300}
                placeholder="Tambahkan catatan atau keterangan tambahan..."
                className="mt-1 w-full resize-none overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#D97745] focus:outline-none focus:ring-1 focus:ring-[#D97745]"
                {...register('notes')}
                onInput={autoResize}
              />
              <p className="text-right text-xs">{notes?.length ?? 0}/300</p>
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
