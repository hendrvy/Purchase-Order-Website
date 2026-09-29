-- Migration: add the `password_resets` table (self-service "forgot
-- password" flow via emailed reset link).
--
-- Run this once against any existing database that was created before
-- this table was added to backend/db/schema.sql. New databases created
-- from the current schema.sql already include this table and do NOT need
-- this migration.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/db/migrations/002_add_password_resets_table.sql
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_resets_user
        FOREIGN KEY (user_id)
        REFERENCES companies(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
