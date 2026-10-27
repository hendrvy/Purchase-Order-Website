-- Migration: add the 'submitted' status (new default for purchase orders)
-- and the po_notes table backing the forum-style note thread.
--
-- Status flow is now: submitted -> verifying -> process -> shipping -> complete
-- (or submitted -> rejected). Existing rows keep their current status.
--
-- New databases created from the current schema.sql already include these
-- changes and do NOT need this migration.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/db/migrations/005_add_submitted_status_and_po_notes.sql

BEGIN;

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('submitted', 'verifying', 'process', 'shipping', 'complete', 'rejected'));
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'submitted';

CREATE TABLE IF NOT EXISTS po_notes (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    company_id INTEGER NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status_from VARCHAR(50) DEFAULT NULL,
    status_to VARCHAR(50) DEFAULT NULL,
    proof_type VARCHAR(20) DEFAULT NULL CHECK (proof_type IN ('resi', 'pickup')),
    attachment_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_po_notes_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_notes_parent
        FOREIGN KEY (parent_id) REFERENCES po_notes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_notes_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_notes_attachment
        FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_po_notes_purchase_order_id ON po_notes(purchase_order_id, created_at);

COMMIT;
