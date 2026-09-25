/**
 * @import { User } from '@/types/user.js'
 * @import { Role } from '@/types/role.js'
 */

import { apiClient, ApiError } from '@/api/client.js'
import { MOCK_COMPANIES } from '@/mocks/companies.js'

/**
 * @typedef {Object} CreateCompanyInput
 * @property {string} username
 * @property {string} password
 * @property {string} company_name
 * @property {string} email
 * @property {string} [phone]
 * @property {Role} role
 */

/**
 * Set VITE_USE_MOCKS=true in .env to develop against the in-memory mock
 * company list in src/mocks/companies.js without a running backend (same
 * flag as api/po.js and api/auth.js).
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

let mockSequence = MOCK_COMPANIES.length + 1

/**
 * @param {{ role?: Role | 'all', search?: string }} filters
 * @returns {User[]}
 */
function filterMockCompanies(filters) {
  let result = MOCK_COMPANIES

  if (filters.role && filters.role !== 'all') {
    result = result.filter((company) => company.role === filters.role)
  }

  if (filters.search) {
    const term = filters.search.trim().toLowerCase()
    if (term) {
      result = result.filter(
        (company) =>
          company.username.toLowerCase().includes(term) ||
          company.company_name.toLowerCase().includes(term) ||
          company.email.toLowerCase().includes(term),
      )
    }
  }

  return [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/**
 * Admin-only: list all companies/users, optionally filtered by role and/or
 * a search term matched against username/company_name/email (see
 * backend/api/admin_handlers.go AdminListCompanies).
 *
 * @param {{ role?: Role | 'all', search?: string }} [filters]
 * @returns {Promise<User[]>}
 */
export async function getCompanies(filters = {}) {
  if (shouldUseMocks()) {
    await delay(300)
    return filterMockCompanies(filters)
  }

  const params = {}
  if (filters.role && filters.role !== 'all') params.role = filters.role
  if (filters.search) params.search = filters.search

  const response = await apiClient.get('/api/companies', { params })
  return response.data.data ?? []
}

/**
 * Admin-only: create a new account with an explicit role (see
 * backend/api/admin_handlers.go AdminCreateCompany).
 *
 * @param {CreateCompanyInput} input
 * @returns {Promise<User>}
 */
export async function createCompany(input) {
  if (shouldUseMocks()) {
    await delay(500)

    // super_admin can never be assigned through the app - mirrors the
    // backend rejection in AdminCreateCompany. See types/role.js
    // ASSIGNABLE_ROLES.
    if (input.role === 'super_admin') {
      throw new ApiError('Role super_admin tidak bisa dibuat melalui aplikasi.', { status: 403 })
    }

    if (MOCK_COMPANIES.some((company) => company.username === input.username)) {
      throw new ApiError('Username sudah digunakan.', {
        status: 409,
        errors: { username: 'Username sudah digunakan.' },
      })
    }
    if (MOCK_COMPANIES.some((company) => company.email === input.email)) {
      throw new ApiError('Email sudah terdaftar.', {
        status: 409,
        errors: { email: 'Email sudah terdaftar.' },
      })
    }

    const now = new Date().toISOString()
    /** @type {User} */
    const newCompany = {
      id: 1000 + mockSequence++,
      username: input.username,
      company_name: input.company_name?.trim() || input.username,
      email: input.email,
      phone: input.phone ?? '',
      role: input.role,
      created_at: now,
      updated_at: now,
    }
    MOCK_COMPANIES.unshift(newCompany)
    return newCompany
  }

  const response = await apiClient.post('/api/companies', {
    company: {
      username: input.username,
      password: input.password,
      company_name: input.company_name ?? '',
      email: input.email,
      phone: input.phone ?? '',
      role: input.role,
    },
  })
  return response.data.data
}

/**
 * Admin-only: change another account's role (see
 * backend/api/admin_handlers.go AdminUpdateCompanyRole).
 *
 * @param {number} companyId
 * @param {Role} role
 * @returns {Promise<void>}
 */
export async function updateCompanyRole(companyId, role) {
  if (shouldUseMocks()) {
    await delay(300)

    // super_admin can never be assigned, and an existing super_admin's
    // role can never be changed by anyone - mirrors the backend
    // rejections in AdminUpdateCompanyRole. See types/role.js
    // ASSIGNABLE_ROLES.
    if (role === 'super_admin') {
      throw new ApiError('Role super_admin tidak bisa diberikan melalui aplikasi.', {
        status: 403,
      })
    }

    const company = MOCK_COMPANIES.find((item) => item.id === companyId)
    if (company?.role === 'super_admin') {
      throw new ApiError('Role akun Super Admin tidak dapat diubah.', { status: 403 })
    }
    if (company) {
      company.role = role
      company.updated_at = new Date().toISOString()
    }
    return
  }

  await apiClient.put(`/api/companies/${companyId}/role`, { role })
}

/**
 * Admin-only: set a new password for another account without needing the
 * current password (see backend/api/admin_handlers.go
 * AdminResetCompanyPassword).
 *
 * @param {number} companyId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function resetCompanyPassword(companyId, newPassword) {
  if (shouldUseMocks()) {
    await delay(300)

    // Mirrors the backend rejection in AdminResetCompanyPassword - a
    // super_admin's password can only be changed by the account owner.
    const company = MOCK_COMPANIES.find((item) => item.id === companyId)
    if (company?.role === 'super_admin') {
      throw new ApiError('Password akun Super Admin tidak dapat direset oleh admin lain.', {
        status: 403,
      })
    }
    return
  }

  await apiClient.post(`/api/companies/${companyId}/reset-password`, {
    new_password: newPassword,
  })
}
