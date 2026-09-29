/**
 * @import { AuthUser } from '@/types/user.js'
 */

/**
 * Dummy credential/user pairs used by the mock auth layer (src/api/auth.js)
 * when VITE_USE_MOCKS=true, for developing without a running backend.
 * Passwords are plain text here on purpose - this is mock-only data, never
 * sent to or stored by a real backend.
 *
 * @type {Array<{ username: string, password: string, user: AuthUser }>}
 */
export const MOCK_ACCOUNTS = [
  {
    username: 'budi.user',
    password: 'password123',
    user: {
      id: 1,
      username: 'budi.user',
      company_name: 'PT Budi Jaya',
      email: 'budi@mail.com',
      phone: '+6281111111111',
      role: 'user',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
  {
    username: 'andi.validator',
    password: 'password123',
    user: {
      id: 2,
      username: 'andi.validator',
      company_name: 'PT Andi Validasi',
      email: 'andi@mail.com',
      phone: '+6282222222222',
      role: 'validator',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
  {
    username: 'sari.admin',
    password: 'password123',
    user: {
      id: 3,
      username: 'sari.admin',
      company_name: 'PT Sari Admin',
      email: 'sari@mail.com',
      phone: '+6283333333333',
      role: 'admin',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  },
]
