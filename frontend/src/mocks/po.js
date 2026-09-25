/**
 * @import { PurchaseOrder } from '@/types/po.js'
 * @import { Attachment } from '@/types/attachment.js'
 */

/**
 * Builds `count` dummy attachments for the static mock PO list below (used
 * to exercise AttachmentThumbnailList's layout - e.g. the "+N" popover
 * only shows up once a PO has more than MAX_VISIBLE_ICONS attachments).
 * `filepath` doesn't need to be a real/loadable URL here: in mock mode
 * (VITE_USE_MOCKS=true), api/attachments.js's loadAttachmentPreviewUrl
 * returns `attachment.filepath` as-is without ever fetching it, so these
 * are only used to render the file icon/name, not an actual preview.
 *
 * @param {number} poId
 * @param {number} count
 * @returns {Attachment[]}
 */
function buildDummyAttachments(poId, count) {
  const names = [
    'invoice-pembelian.pdf',
    'foto-barang-1.jpg',
    'foto-barang-2.jpg',
    'surat-jalan.pdf',
    'nota-pembayaran.png',
    'spesifikasi-teknis.pdf',
    'foto-barang-3.jpg',
    'kwitansi.pdf',
    'foto-lokasi.jpg',
    'dokumen-pendukung.pdf',
  ]

  return Array.from({ length: count }, (_, index) => {
    const filename = names[index % names.length]
    return {
      id: poId * 100 + index,
      filename,
      filepath: '',
      mime_type: filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      created_at: '2026-09-18T02:00:00.000Z',
    }
  })
}

/**
 * Dummy purchase orders used by the dashboard/history pages when
 * VITE_USE_MOCKS=true (developing without a running backend). Mirrors the
 * PurchaseOrder shape documented in src/types/po.js, which in turn mirrors
 * the backend PurchaseOrder model (backend/api/models.go).
 *
 * @type {PurchaseOrder[]}
 */
export const MOCK_PURCHASE_ORDERS = [
  {
    id: 1001,
    po_number: 'PO-2026-1001',
    company_id: 1,
    title: 'ATK Kantor Bulan September',
    total_amount: 2500000,
    notes: '',
    status: 'verifying',
    resi_number: '',
    attachments: buildDummyAttachments(1001, 2),
    created_at: '2026-09-18T02:00:00.000Z',
    updated_at: '2026-09-18T02:00:00.000Z',
  },
  {
    id: 1002,
    po_number: 'PO-2026-1002',
    company_id: 1,
    title: 'Sewa Laptop Divisi Marketing',
    total_amount: 15000000,
    notes: '',
    status: 'verifying',
    resi_number: '',
    attachments: buildDummyAttachments(1002, 7),
    created_at: '2026-09-17T01:00:00.000Z',
    updated_at: '2026-09-19T04:30:00.000Z',
  },
  {
    id: 1003,
    po_number: 'PO-2026-1003',
    company_id: 4,
    title: 'Perlengkapan Meeting Room',
    total_amount: 4200000,
    notes: '',
    status: 'process',
    resi_number: '',
    attachments: buildDummyAttachments(1003, 0),
    created_at: '2026-09-14T01:00:00.000Z',
    updated_at: '2026-09-16T02:00:00.000Z',
  },
  {
    id: 1004,
    po_number: 'PO-2026-1004',
    company_id: 5,
    title: 'Server Rack Tambahan',
    total_amount: 32000000,
    notes: '',
    status: 'shipping',
    resi_number: 'JNE-8827301',
    attachments: buildDummyAttachments(1004, 10),
    created_at: '2026-09-09T01:00:00.000Z',
    updated_at: '2026-09-20T05:00:00.000Z',
  },
  {
    id: 1005,
    po_number: 'PO-2026-1005',
    company_id: 1,
    title: 'Lisensi Software Desain',
    total_amount: 6800000,
    notes: '',
    status: 'complete',
    resi_number: '',
    attachments: buildDummyAttachments(1005, 1),
    created_at: '2026-08-30T01:00:00.000Z',
    updated_at: '2026-09-05T01:00:00.000Z',
  },
  {
    id: 1006,
    po_number: 'PO-2026-1006',
    company_id: 4,
    title: 'Renovasi Pantry Kantor',
    total_amount: 9500000,
    notes: '',
    status: 'complete',
    resi_number: '',
    attachments: buildDummyAttachments(1006, 3),
    created_at: '2026-08-18T01:00:00.000Z',
    updated_at: '2026-08-25T01:00:00.000Z',
  },
  {
    id: 1007,
    po_number: 'PO-2026-1007',
    company_id: 5,
    title: 'Pembelian Drone Survey',
    total_amount: 45000000,
    notes: 'Anggaran belum tersedia untuk kategori ini.',
    status: 'rejected',
    resi_number: '',
    attachments: buildDummyAttachments(1007, 0),
    created_at: '2026-09-04T01:00:00.000Z',
    updated_at: '2026-09-06T01:00:00.000Z',
  },
  {
    id: 1008,
    po_number: 'PO-2026-1008',
    company_id: 1,
    title: 'Katering Acara Internal',
    total_amount: 3100000,
    notes: '',
    status: 'verifying',
    resi_number: '',
    attachments: buildDummyAttachments(1008, 4),
    created_at: '2026-09-11T01:00:00.000Z',
    updated_at: '2026-09-13T01:00:00.000Z',
  },
]
