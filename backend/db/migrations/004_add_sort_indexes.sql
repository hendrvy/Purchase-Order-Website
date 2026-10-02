-- Migration: add indexes backing the default sort columns used by the
-- server-side paginated list endpoints.
--
-- The dashboard/history tables are now sorted and paginated in SQL, and
-- their default sort key is `updated_at` (purchase orders) / `created_at`
-- (companies). Without an index, ORDER BY + OFFSET on those columns forces
-- a full sort of the table. The other sortable/filter columns already have
-- indexes in backend/db/schema.sql (status, company_id, username, email,
-- user_id, changed_at, created_at on audit tables).
--
-- New databases created from the current schema.sql already include these
-- indexes and do NOT need this migration.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/db/migrations/004_add_sort_indexes.sql

CREATE INDEX IF NOT EXISTS idx_purchase_orders_updated_at
    ON purchase_orders(updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_created_at
    ON companies(created_at DESC)
    WHERE deleted_at IS NULL;
