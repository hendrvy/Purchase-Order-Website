/**
 * @import { CreatePOInput, PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

import { apiClient, ApiError, unwrapPaginated } from '@/api/client.js'
import { getStoredUser } from '@/lib/storage.js'
import { isAdminLikeRole } from '@/types/role.js'
import { MOCK_PURCHASE_ORDERS } from '@/mocks/po.js'
import { MOCK_COMPANIES } from '@/mocks/companies.js'

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
 * Attaches the requesting company (minus password) to each mock PO,
 * mirroring the `Preload("Company")` done server-side (see
 * GetPurchaseOrdersDB in backend/api/database.go), so the History table's
 * "Perusahaan" column has data to show in mock mode too.
 *
 * @param {PurchaseOrder[]} orders
 * @returns {PurchaseOrder[]}
 */
function withMockCompany(orders) {
  return orders.map((order) => ({
    ...order,
    company: MOCK_COMPANIES.find((company) => company.id === order.company_id) ?? null,
  }))
}

/** Per-field comparators for mock sorting, mirroring PurchaseOrderSortColumns
 * in backend/api/database.go. */
const MOCK_PO_SORT_ACCESSORS = {
  updated_at: (order) => new Date(order.updated_at).getTime(),
  created_at: (order) => new Date(order.created_at).getTime(),
  company: (order) => order.company?.company_name ?? '',
  status: (order) => order.status,
  total_amount: (order) => order.total_amount,
  po_number: (order) => order.po_number,
}

/**
 * @param {string | number | null | undefined} a
 * @param {string | number | null | undefined} b
 * @param {number} dir
 */
function compareValues(a, b, dir) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir
  return String(a).localeCompare(String(b), 'id', { sensitivity: 'base' }) * dir
}

/**
 * In-memory equivalent of GetPurchaseOrdersDB (backend): filter, sort, then
 * slice a page.
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc', status?: string, search?: string, companyID?: number }} [options]
 * @returns {{ items: PurchaseOrder[], meta: import('@/types/api.js').PaginationMeta }}
 */
function mockQueryPurchaseOrders(options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = 'updated_at',
    order = 'desc',
    status,
    search,
    companyID,
  } = options

  let result = withMockCompany(MOCK_PURCHASE_ORDERS)

  if (companyID != null) {
    result = result.filter((order_) => order_.company_id === companyID)
  }
  if (status) {
    result = result.filter((order_) => order_.status === status)
  }
  const term = search?.trim().toLowerCase()
  if (term) {
    result = result.filter(
      (order_) =>
        order_.po_number?.toLowerCase().includes(term) ||
        order_.title?.toLowerCase().includes(term) ||
        order_.resi_number?.toLowerCase().includes(term) ||
        order_.company?.company_name?.toLowerCase().includes(term),
    )
  }

  const getValue = MOCK_PO_SORT_ACCESSORS[sort] ?? MOCK_PO_SORT_ACCESSORS.updated_at
  const dir = order === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => compareValues(getValue(a), getValue(b), dir))

  const total = result.length
  const start = (page - 1) * limit

  return {
    items: result.slice(start, start + limit),
    meta: { page, page_size: limit, total, total_pages: Math.ceil(total / limit) },
  }
}

/**
 * Builds the mock dashboard summary, mirroring GetDashboardSummaryDB
 * (backend/api/database.go).
 *
 * @param {number | undefined} companyID
 * @param {boolean} includeAccounts
 */
function mockDashboardSummary(companyID, includeAccounts) {
  const visible = withMockCompany(MOCK_PURCHASE_ORDERS).filter(
    (order) => companyID == null || order.company_id === companyID,
  )

  /** @type {Record<string, number>} */
  const countsByStatus = {}
  for (const order of visible) {
    countsByStatus[order.status] = (countsByStatus[order.status] ?? 0) + 1
  }

  const now = new Date()
  const completedThisMonth = visible.filter((order) => {
    if (order.status !== 'complete') return false
    const updatedAt = new Date(order.updated_at)
    return updatedAt.getMonth() === now.getMonth() && updatedAt.getFullYear() === now.getFullYear()
  }).length

  const recentOrders = [...visible]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)

  /** @type {{ purchase_orders: object, accounts?: object }} */
  const summary = {
    purchase_orders: {
      total: visible.length,
      counts_by_status: countsByStatus,
      completed_this_month: completedThisMonth,
      recent_orders: recentOrders,
    },
  }

  if (includeAccounts) {
    /** @type {Record<string, number>} */
    const byRole = {}
    for (const company of MOCK_COMPANIES) {
      byRole[company.role] = (byRole[company.role] ?? 0) + 1
    }
    summary.accounts = { total: MOCK_COMPANIES.length, by_role: byRole }
  }

  return summary
}

/**
 * Fetches a page of purchase orders visible to the logged-in user. The
 * backend applies role-based scoping server-side and does the filtering,
 * sorting, and pagination in SQL (see
 * backend/api/purchase_order_handlers.go GetPurchaseOrders) - this just
 * forwards the params. Returns `{ items, meta }`.
 *
 * @param {{ page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc', status?: string, search?: string }} [options]
 * @returns {Promise<{ items: PurchaseOrder[], meta: import('@/types/api.js').PaginationMeta }>}
 */
export async function getPurchaseOrders(options = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    const user = getStoredUser()
    return mockQueryPurchaseOrders({
      ...options,
      companyID: user?.role === 'user' ? user.id : undefined,
    })
  }

  const { page = 1, limit = 10, sort, order, status, search } = options
  const params = { page, limit }
  if (sort) params.sort = sort
  if (order) params.order = order
  if (status) params.status = status
  if (search) params.search = search

  const response = await apiClient.get('/api/purchase-orders', { params })
  return unwrapPaginated(response)
}

/**
 * Fetches the dashboard aggregates (PO counts/totals + recent orders, and
 * per-role account counts for admins) in a single request instead of
 * listing every PO/company client-side (see
 * backend/api/purchase_order_handlers.go GetDashboardSummary).
 *
 * @returns {Promise<{
 *   purchase_orders: {
 *     total: number,
 *     counts_by_status: Record<string, number>,
 *     completed_this_month: number,
 *     recent_orders: PurchaseOrder[],
 *   },
 *   accounts?: { total: number, by_role: Record<string, number> },
 * }>}
 */
export async function getDashboardSummary() {
  if (shouldUseMocks()) {
    await delay(300)
    const user = getStoredUser()
    return mockDashboardSummary(
      user?.role === 'user' ? user.id : undefined,
      isAdminLikeRole(user?.role),
    )
  }

  const response = await apiClient.get('/api/summary/dashboard')
  return response.data.data
}

/**
 * Updates the status of a purchase order. Only callable by validator/admin
 * accounts (enforced server-side, see
 * backend/api/purchase_order_handlers.go UpdatePurchaseOrderStatus).
 * `resi_number` is required by the backend when moving to `shipping`.
 *
 * @param {number} id
 * @param {{ status: import('@/types/po.js').POStatus, resi_number?: string, notes?: string }} input
 * @returns {Promise<void>}
 */
export async function updatePurchaseOrderStatus(id, input) {
  if (shouldUseMocks()) {
    await delay(400)

    if (input.status === 'shipping' && !input.resi_number) {
      throw new ApiError('No. Resi wajib diisi untuk status Shipping.', {
        status: 400,
        errors: { resi_number: 'No. Resi wajib diisi.' },
      })
    }

    const order = MOCK_PURCHASE_ORDERS.find((item) => item.id === id)
    if (!order) {
      throw new ApiError('Purchase order tidak ditemukan.', { status: 404 })
    }

    order.status = input.status
    if (input.resi_number) order.resi_number = input.resi_number
    if (input.notes) order.notes = input.notes
    order.updated_at = new Date().toISOString()
    return
  }

  await apiClient.put(`/api/purchase-orders/${id}/status`, input)
}

/**
 * Cancels (deletes) a purchase order. Only callable by the owning `user`
 * while the PO is still in 'verifying' status - the backend rejects the
 * request with 403 otherwise (see
 * backend/api/purchase_order_handlers.go DeletePurchaseOrder).
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deletePurchaseOrder(id) {
  if (shouldUseMocks()) {
    await delay(400)

    const order = MOCK_PURCHASE_ORDERS.find((item) => item.id === id)
    if (!order) {
      throw new ApiError('Purchase order tidak ditemukan.', { status: 404 })
    }
    if (order.status !== 'verifying') {
      throw new ApiError("Hanya PO dengan status 'Verifying' yang dapat dibatalkan.", {
        status: 403,
      })
    }

    const index = MOCK_PURCHASE_ORDERS.indexOf(order)
    MOCK_PURCHASE_ORDERS.splice(index, 1)
    return
  }

  await apiClient.delete(`/api/purchase-orders/${id}`)
}
