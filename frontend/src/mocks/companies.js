/**
 * @import { User } from '@/types/user.js'
 */

/**
 * Dummy company/user accounts used by the admin User Management page (and
 * as the `company` shown on PO tables) when VITE_USE_MOCKS=true, for
 * developing without a running backend. Mirrors the backend `Company`
 * model (backend/api/models.go), minus the password field.
 *
 * Kept mutable (not `const`-frozen) so the mock create-account/change-role
 * flows in api/companies.js can push/update entries and have the User
 * Management table reflect the change immediately, mirroring the pattern
 * already used for MOCK_PURCHASE_ORDERS in mocks/po.js.
 *
 * @type {User[]}
 */
export const MOCK_COMPANIES = [
  {
    id: 1,
    username: 'budi.user',
    company_name: 'PT Budi Jaya',
    email: 'budi@mail.com',
    phone: '+6281111111111',
    role: 'user',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    username: 'andi.validator',
    company_name: 'PT Andi Validasi',
    email: 'andi@mail.com',
    phone: '+6282222222222',
    role: 'validator',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    username: 'sari.admin',
    company_name: 'PT Sari Admin',
    email: 'sari@mail.com',
    phone: '+6283333333333',
    role: 'admin',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    username: 'citra.retail',
    company_name: 'CV Citra Retail Nusantara',
    email: 'citra@mail.com',
    phone: '+6284444444444',
    role: 'user',
    created_at: '2025-03-12T00:00:00.000Z',
    updated_at: '2025-03-12T00:00:00.000Z',
  },
  {
    id: 5,
    username: 'doni.logistik',
    company_name: 'PT Doni Logistik Sejahtera',
    email: 'doni@mail.com',
    phone: '+6285555555555',
    role: 'user',
    created_at: '2025-05-20T00:00:00.000Z',
    updated_at: '2025-05-20T00:00:00.000Z',
  },
]
