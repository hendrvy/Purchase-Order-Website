/**
 * @import { ProfileChangeLog, PasswordChangeLog, DownloadLogEntry } from '@/api/audit.js'
 */

/**
 * Dummy audit log entries used by the admin Activity Log page when
 * VITE_USE_MOCKS=true, for developing without a running backend. Mirrors
 * the backend ProfileChange model (backend/api/models.go).
 *
 * @type {ProfileChangeLog[]}
 */
export const MOCK_PROFILE_CHANGE_LOGS = [
  {
    id: 1,
    user_id: 4,
    field_name: 'phone',
    old_value: '+6284440001111',
    new_value: '+6284444444444',
    changed_at: '2026-09-15T03:20:00.000Z',
    ip_address: '10.0.0.14',
  },
  {
    id: 2,
    user_id: 2,
    field_name: 'role',
    old_value: 'user',
    new_value: 'validator',
    changed_at: '2026-09-10T08:05:00.000Z',
    ip_address: '10.0.0.2',
  },
  {
    id: 3,
    user_id: 1,
    field_name: 'email',
    old_value: 'budi.old@mail.com',
    new_value: 'budi@mail.com',
    changed_at: '2026-08-28T11:40:00.000Z',
    ip_address: '10.0.0.9',
  },
]

/**
 * @type {PasswordChangeLog[]}
 */
export const MOCK_PASSWORD_CHANGE_LOGS = [
  {
    id: 1,
    user_id: 5,
    changed_at: '2026-09-18T06:12:00.000Z',
    ip_address: '10.0.0.21',
  },
  {
    id: 2,
    user_id: 1,
    changed_at: '2026-09-02T09:30:00.000Z',
    ip_address: '10.0.0.9',
  },
]

/**
 * @type {DownloadLogEntry[]}
 */
export const MOCK_DOWNLOAD_LOGS = [
  {
    id: 1,
    user_id: 2,
    attachment_id: 101,
    po_id: 1004,
    ip_address: '10.0.0.2',
    created_at: '2026-09-20T05:10:00.000Z',
  },
  {
    id: 2,
    user_id: 3,
    attachment_id: 98,
    po_id: 1002,
    ip_address: '10.0.0.5',
    created_at: '2026-09-19T07:45:00.000Z',
  },
]
