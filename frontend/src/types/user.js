/**
 * @import { Role } from './role.js'
 */

/**
 * Matches the backend `Company` model (backend/api/models.go) - the
 * backend has no separate "user" concept, a Company row IS the account.
 *
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} company_name
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [photo_path] - Filename on disk; build a viewable URL via GET /api/companies/:id/photo.
 * @property {Role} role
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Payload returned by POST /api/login alongside a token.
 *
 * @typedef {User} AuthUser
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResult
 * @property {string} token
 * @property {AuthUser} user
 */

export {}
