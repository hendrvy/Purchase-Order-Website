/**
 * @import { CreatePOInput, PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

import { apiClient, ApiError } from '@/api/client.js'
import { getStoredUser } from '@/lib/storage.js'
import { MOCK_PURCHASE_ORDERS } from '@/mocks/po.js'

/**
 * The real backend doesn't have PO creation, file upload, `notes`, or
 * `total_amount` support yet (see backend/api/models.go - PurchaseOrder
 * only has po_number/company_id/attachment_id/resi_number/status). Build
 * against a mock layer until the backend contract catches up, same
 * pattern as src/api/auth.js. Set VITE_USE_MOCKS=false to switch over
 * once the real POST /api/purchase-orders endpoint exists.
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS !== 'false'
}

/**
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let mockSequence = MOCK_PURCHASE_ORDERS.length + 1

/**
 * @param {File[]} files
 * @returns {Attachment[]}
 */
function buildMockAttachments(files) {
  return files.map((file, index) => ({
    id: `att-${Date.now()}-${index}`,
    po_id: '',
    uploaded_by: getStoredUser()?.id ?? 'unknown',
    original_filename: file.name,
    // In the mock layer we keep a local blob URL just so a preview/detail
    // page could display it; the real backend will return a server URL.
    url: URL.createObjectURL(file),
    mime_type: file.type,
    file_size: file.size,
    created_at: new Date().toISOString(),
  }))
}

/**
 * @param {CreatePOInput} input
 * @returns {Promise<PurchaseOrder>}
 */
async function mockCreatePurchaseOrder(input) {
  await delay(700)

  if (!input.title?.trim()) {
    throw new ApiError('Judul purchase order wajib diisi.', {
      status: 422,
      errors: { title: 'Judul wajib diisi.' },
    })
  }

  if (!input.attachments || input.attachments.length === 0) {
    throw new ApiError('Minimal satu file (gambar/PDF) wajib dilampirkan.', {
      status: 422,
      errors: { attachments: 'Lampirkan minimal satu file.' },
    })
  }

  const user = getStoredUser()
  const now = new Date().toISOString()
  const sequence = mockSequence++

  const attachments = buildMockAttachments(input.attachments)

  /** @type {PurchaseOrder} */
  const newOrder = {
    id: `po-${1000 + sequence}`,
    po_number: `PO-${new Date().getFullYear()}-${String(1000 + sequence).padStart(4, '0')}`,
    requester_id: user?.id ?? 'unknown',
    requester_name: user?.full_name ?? 'Unknown',
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    total_amount: input.total_amount,
    status: 'draft',
    created_at: now,
    updated_at: now,
    resi_number: '',
  }

  attachments.forEach((attachment) => {
    attachment.po_id = newOrder.id
  })

  // Keep the in-memory mock list in sync so dashboard/history pages that
  // read MOCK_PURCHASE_ORDERS immediately reflect the new PO.
  MOCK_PURCHASE_ORDERS.unshift(newOrder)

  return newOrder
}

/**
 * @param {CreatePOInput} input
 * @returns {Promise<PurchaseOrder>}
 */
export async function createPurchaseOrder(input) {
  if (shouldUseMocks()) {
    return mockCreatePurchaseOrder(input)
  }

  const formData = new FormData()
  formData.append('title', input.title)
  formData.append('total_amount', String(input.total_amount))
  if (input.notes) formData.append('notes', input.notes)
  for (const file of input.attachments) {
    formData.append('attachments', file)
  }

  const response = await apiClient.post('/api/purchase-orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
