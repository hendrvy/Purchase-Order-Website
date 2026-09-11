/**
 * @import { AuthUser } from '@/types/user.js'
 */

/**
 * Dummy credential/user pairs used by the mock auth layer (src/api/auth.js)
 * while the real backend contract (email + role based User) is not ready
 * yet. Passwords are plain text here on purpose - this is mock-only data,
 * never sent to or stored by a real backend.
 *
 * @type {Array<{ email: string, password: string, user: AuthUser }>}
 */
export const MOCK_ACCOUNTS = [
  {
    email: 'buyer@mail.com',
    password: 'password123',
    user: {
      id: 'usr-buyer-1',
      email: 'buyer@mail.com',
      full_name: 'Budi Buyer',
      role: 'buyer',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
  {
    email: 'approver@mail.com',
    password: 'password123',
    user: {
      id: 'usr-approver-1',
      email: 'approver@mail.com',
      full_name: 'Andi Approver',
      role: 'approver',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
  {
    email: 'admin@mail.com',
    password: 'password123',
    user: {
      id: 'usr-admin-1',
      email: 'admin@mail.com',
      full_name: 'Sari Admin',
      role: 'admin',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
]
