/**
 * @import { Role } from './role.js'
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {Role} role
 * @property {boolean} is_active
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Payload returned by POST /api/login (or GET /api/me) alongside a token.
 *
 * @typedef {User} AuthUser
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResult
 * @property {string} token
 * @property {AuthUser} user
 */

export {}
