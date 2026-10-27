-- Migration: track which note of each purchase order a user has read, so the
-- dashboard can show unread messages from the forum-style note thread.
--
-- last_read_note_id is the highest po_notes.id the user has seen on that PO;
-- anything newer (written by the other side) counts as unread.
--
-- Existing notes are marked as read for every current account so the first
-- deploy doesn't flood the dashboards with old messages.
--
-- New databases created from the current schema.sql already include this
-- table and do NOT need this migration.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/db/migrations/006_add_po_note_reads.sql

CREATE TABLE IF NOT EXISTS po_note_reads (
    user_id INTEGER NOT NULL,
    purchase_order_id INTEGER NOT NULL,
    last_read_note_id INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, purchase_order_id),
    CONSTRAINT fk_po_note_reads_user
        FOREIGN KEY (user_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_note_reads_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

INSERT INTO po_note_reads (user_id, purchase_order_id, last_read_note_id)
SELECT c.id, n.purchase_order_id, MAX(n.id)
FROM companies c
CROSS JOIN po_notes n
GROUP BY c.id, n.purchase_order_id
ON CONFLICT DO NOTHING;
