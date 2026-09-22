/**
 * @import { CreatePOInput, PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

import { apiClient, ApiError } from '@/api/client.js'
import { getStoredUser } from '@/lib/storage.js'
import { MOCK_PURCHASE_ORDERS } from '@/mocks/po.js'

/**
 * Set VITE_USE_MOCKS=true in .env to develop against the in-memory mock
 * PO list in src/mocks/po.js without a running backend. Defaults to false
 * (real API) now that backend/api/purchase_order_handlers.go
 * CreatePurchaseOrder supports title/total_amount and multiple file
 * attachments.
 *
 * @returns {boolean}
 */
function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS === 'true'
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
    id: Date.now() + index,
    filename: file.name,
    // In the mock layer we keep a local blob URL just so a preview/detail
    // page could display it; the real backend returns a server file path.
    filepath: URL.createObjectURL(file),
    mime_type: file.type,
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

  /** @type {PurchaseOrder} */
  const newOrder = {
    id: 1000 + sequence,
    po_number: `PO-${new Date().getFullYear()}-${String(1000 + sequence).padStart(4, '0')}`,
    company_id: user?.id ?? 0,
    title: input.title.trim(),
    total_amount: input.total_amount,
    notes: input.notes?.trim() || '',
    resi_number: '',
    status: 'verifying',
    attachments: buildMockAttachments(input.attachments),
    created_at: now,
    updated_at: now,
  }

  // Keep the in-memory mock list in sync so dashboard/history pages that
  // read MOCK_PURCHASE_ORDERS immediately reflect the new PO.
  MOCK_PURCHASE_ORDERS.unshift(newOrder)

  return newOrder
}

/**
 * Creates a purchase order against the real backend. The backend expects
 * a multipart form with a `payload` field (JSON string of the PO fields)
 * plus one or more files under the `files` field (see
 * backend/api/purchase_order_handlers.go CreatePurchaseOrder).
 *
 * `po_number` is generated client-side for now since the backend has no
 * auto-numbering endpoint yet.
 *
 * @param {CreatePOInput} input
 * @returns {Promise<PurchaseOrder>}
 */
export async function createPurchaseOrder(input) {
  if (shouldUseMocks()) {
    return mockCreatePurchaseOrder(input)
  }

  const user = getStoredUser()

  const payload = {
    po_number: input.po_number ?? `PO-${Date.now()}`,
    company_id: user?.id,
    title: input.title,
    total_amount: input.total_amount,
    notes: input.notes ?? '',
  }

  const formData = new FormData()
  formData.append('payload', JSON.stringify(payload))
  for (const file of input.attachments) {
    formData.append('files', file)
  }

  const response = await apiClient.post('/api/purchase-orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}

/**
 * Fetches purchase orders visible to the logged-in user. The backend
 * applies role-based filtering server-side: `user` role only sees their
 * own company's POs, `validator`/`admin` see all (paginated).
 *
 * @param {{ page?: number, limit?: number }} [options]
 * @returns {Promise<PurchaseOrder[]>}
 */
export async function getPurchaseOrders(options = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    return MOCK_PURCHASE_ORDERS
  }

  const { page = 1, limit = 100 } = options
  const response = await apiClient.get('/api/purchase-orders', { params: { page, limit } })
  return response.data.data ?? []
}
