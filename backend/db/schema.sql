-- PostgreSQL Schema for Purchase Order Management System
-- Includes soft deletes (deleted_at) on all tables for data preservation

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

-- 'super_admin' behaves like 'admin' for access purposes, but is locked:
-- it can never be assigned through the app (create/role-change endpoints
-- reject it outright) and, once set, can never be demoted or have its
-- password reset by anyone via the app - only a direct DB UPDATE can grant
-- or revoke it. See backend/api/models.go RoleSuperAdmin for details.
CREATE TYPE roles AS ENUM ('user', 'validator', 'admin', 'super_admin');

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    role roles NOT NULL DEFAULT 'user',
    username VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    photo_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP  -- NULL = active, timestamp = soft deleted
);

-- Index for fast lookups by username
CREATE INDEX IF NOT EXISTS idx_companies_username ON companies(username) WHERE deleted_at IS NULL;

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email) WHERE deleted_at IS NULL;

-- ============================================================================
-- ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mime_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP  -- NULL = active, timestamp = soft deleted
);

-- Index for fast file lookups
CREATE INDEX IF NOT EXISTS idx_attachments_filename ON attachments(filename) WHERE deleted_at IS NULL;

-- Index for fast filepath lookups
CREATE INDEX IF NOT EXISTS idx_attachments_filepath ON attachments(filepath) WHERE deleted_at IS NULL;

-- ============================================================================
-- PURCHASE_ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    resi_number VARCHAR(30) DEFAULT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'verifying' CHECK (status IN ('verifying','process', 'shipping', 'complete', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,  -- NULL = active, timestamp = soft deleted

    -- Foreign key constraints (NO CASCADE - prevents accidental deletion)
    CONSTRAINT fk_purchase_orders_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE RESTRICT
);

-- Index for fast lookups by PO number
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number) WHERE deleted_at IS NULL;

-- Index for fast lookups by company (commonly used query)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id) WHERE deleted_at IS NULL;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status) WHERE deleted_at IS NULL;

-- Composite index for common query: find POs for a specific company with a specific status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_status ON purchase_orders(company_id, status) WHERE deleted_at IS NULL;

-- ============================================================================
-- PURCHASE_ORDER_ATTACHMENTS TABLE (many-to-many join table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_order_attachments (
    purchase_order_id INTEGER NOT NULL,
    attachment_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (purchase_order_id, attachment_id),

    CONSTRAINT fk_poa_purchase_order
        FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_poa_attachment
        FOREIGN KEY (attachment_id)
        REFERENCES attachments(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_poa_purchase_order_id ON purchase_order_attachments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poa_attachment_id ON purchase_order_attachments(attachment_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update companies.updated_at on any update
CREATE TRIGGER trigger_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update attachments.updated_at on any update
CREATE TRIGGER trigger_attachments_updated_at
BEFORE UPDATE ON attachments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update purchase_orders.updated_at on any update
CREATE TRIGGER trigger_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DOWNLOAD LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS download_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    attachment_id INTEGER NOT NULL,
    po_id INTEGER NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_download_logs_user 
        FOREIGN KEY (user_id) 
        REFERENCES companies(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_download_logs_attachment 
        FOREIGN KEY (attachment_id) 
        REFERENCES attachments(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_download_logs_po 
        FOREIGN KEY (po_id) 
        REFERENCES purchase_orders(id) 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_attachment_id ON download_logs(attachment_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_created_at ON download_logs(created_at);

-- ============================================================================
-- PASSWORD CHANGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_changes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    
    CONSTRAINT fk_password_changes_user 
        FOREIGN KEY (user_id) 
        REFERENCES companies(id) 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_password_changes_user_id ON password_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_password_changes_changed_at ON password_changes(changed_at);

-- ============================================================================
-- PROFILE CHANGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profile_changes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value VARCHAR(500),
    new_value VARCHAR(500),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    
    CONSTRAINT fk_profile_changes_user 
        FOREIGN KEY (user_id) 
        REFERENCES companies(id) 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_changed_at ON profile_changes(changed_at);

-- ============================================================================
-- SAMPLE QUERIES FOR REFERENCE
-- ============================================================================

-- Get all active companies
-- SELECT * FROM companies WHERE deleted_at IS NULL;

-- Get all POs for a company (excluding soft-deleted)
-- SELECT * FROM purchase_orders WHERE company_id = 1 AND deleted_at IS NULL;

-- Get all pending POs
-- SELECT * FROM purchase_orders WHERE status = 'pending' AND deleted_at IS NULL;

-- Soft delete a company (mark as archived)
-- UPDATE companies SET deleted_at = NOW() WHERE id = 1;

-- Restore a deleted company
-- UPDATE companies SET deleted_at = NULL WHERE id = 1;

-- Hard delete (permanent - use with caution)
-- DELETE FROM purchase_orders WHERE company_id = 1;
-- DELETE FROM companies WHERE id = 1;
