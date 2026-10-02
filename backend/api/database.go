package api

import (
	"fmt"

	"gorm.io/gorm"
)

// ============================================================================
// SORT ALLOW-LISTS
//
// These map the frontend's ?sort= keys to safe, qualified SQL columns. They
// are the only values parseSort (see pagination.go) will ever place into an
// ORDER BY clause, so raw request input never reaches SQL.
// ============================================================================

// PurchaseOrderSortColumns - ?sort= allow-list for purchase order queries.
// The `company` key relies on the LEFT JOIN alias `c` used by
// GetPurchaseOrdersDB.
var PurchaseOrderSortColumns = map[string]string{
	"updated_at":   "purchase_orders.updated_at",
	"created_at":   "purchase_orders.created_at",
	"company":      "c.company_name",
	"status":       "purchase_orders.status",
	"total_amount": "purchase_orders.total_amount",
	"po_number":    "purchase_orders.po_number",
}

// CompanySortColumns - ?sort= allow-list for GET /api/companies.
var CompanySortColumns = map[string]string{
	"created_at":   "created_at",
	"username":     "username",
	"company_name": "company_name",
	"email":        "email",
	"role":         "role",
}

// ChangeLogSortColumns - ?sort= allow-list for the profile/password change
// audit tables (both have a changed_at column).
var ChangeLogSortColumns = map[string]string{
	"changed_at": "changed_at",
	"user_id":    "user_id",
}

// DownloadLogSortColumns - ?sort= allow-list for the download audit table,
// which tracks created_at rather than changed_at.
var DownloadLogSortColumns = map[string]string{
	"created_at": "created_at",
	"user_id":    "user_id",
}

// stripPurchaseOrdersCompanyPassword - Clear the hashed password off each
// preloaded PurchaseOrder.Company before returning to a handler, since
// these POs are serialized straight to JSON (validator/admin PO tables
// need the requesting company's name, not its credentials).
func stripPurchaseOrdersCompanyPassword(purchaseOrders []PurchaseOrder) {
	for i := range purchaseOrders {
		if purchaseOrders[i].Company != nil {
			purchaseOrders[i].Company.Password = ""
		}
	}
}

// buildPurchaseOrdersQuery - Shared filter builder for purchase order lists
// (used by both the count and the page query so they can never drift). The
// companies join is always present so `?sort=company` and a company-name
// search are always available; it's a many-to-one join on the primary key so
// it never multiplies rows.
func buildPurchaseOrdersQuery(companyID *uint, status, search string) *gorm.DB {
	query := DB.Model(&PurchaseOrder{}).
		Joins("LEFT JOIN companies AS c ON c.id = purchase_orders.company_id").
		Where("purchase_orders.deleted_at IS NULL")

	if companyID != nil {
		query = query.Where("purchase_orders.company_id = ?", *companyID)
	}

	if status != "" {
		query = query.Where("purchase_orders.status = ?", status)
	}

	if search != "" {
		like := "%" + search + "%"
		query = query.Where(
			"purchase_orders.po_number ILIKE ? OR purchase_orders.title ILIKE ? OR purchase_orders.resi_number ILIKE ? OR c.company_name ILIKE ?",
			like, like, like, like,
		)
	}

	return query
}

// GetPurchaseOrdersDB - Paginated, sorted, optionally-filtered purchase
// orders. When companyID is non-nil the results are scoped to that company
// (the `user` role); otherwise every company's POs are returned (validator/
// admin). Returns the page slice plus the total row count so handlers can
// build pagination metadata.
func GetPurchaseOrdersDB(companyID *uint, page, limit int, sortColumn, direction, status, search string) ([]PurchaseOrder, int64, error) {
	var purchaseOrders []PurchaseOrder
	var total int64

	if err := buildPurchaseOrdersQuery(companyID, status, search).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	result := buildPurchaseOrdersQuery(companyID, status, search).
		Select("purchase_orders.*").
		Order(sortColumn + " " + direction).
		Offset((page - 1) * limit).
		Limit(limit).
		Preload("Attachments").
		Preload("Company").
		Find(&purchaseOrders)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	stripPurchaseOrdersCompanyPassword(purchaseOrders)

	return purchaseOrders, total, nil
}

// GetPurchaseOrderByIDDB - Get purchase order by ID from database
func GetPurchaseOrderByIDDB(id uint) (*PurchaseOrder, error) {
	fmt.Printf("Getting purchase order with ID: %d\n", id)

	var poByID PurchaseOrder

	result := DB.Preload("Attachments").Preload("Company").First(&poByID, id)

	if result.Error != nil {
		return nil, result.Error
	}

	if poByID.Company != nil {
		poByID.Company.Password = ""
	}

	return &poByID, nil
}

// CreatePurchaseOrderDB - Create purchase order in database
func CreatePurchaseOrderDB(po *PurchaseOrder) error {
	// TODO: Implement logic
	// - Validate required fields
	// - Create purchase order in database
	// - Return error if failed
	fmt.Println("Creating purchase order in database")

	result := DB.Create(po)

	if result.Error != nil {
		return result.Error
	}

	fmt.Printf("Created purchase order with id : %v \n", po.ID)

	return nil
}

// UpdatePurchaseOrderDB - Update purchase order in database
func UpdatePurchaseOrderDB(id uint, po *PurchaseOrder) error {
	// TODO: Implement logic
	// - Update purchase order by ID
	// - Return error if not found or failed
	fmt.Printf("Updating purchase order with ID: %d\n", id)
	result := DB.Model(&PurchaseOrder{}).Where("id = ?", id).Updates(po)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// DeletePurchaseOrderDB - Delete purchase order from database (soft delete)
func DeletePurchaseOrderDB(id uint) error {
	fmt.Printf("Deleting purchase order with ID: %d\n", id)
	result := DB.Model(&PurchaseOrder{}).Where("id = ?", id).Delete(&PurchaseOrder{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("purchase order not found")
	}

	return nil
}

// ============================================================================
// PURCHASE ORDER STATUS DATABASE HELPERS
// ============================================================================

// UpdatePurchaseOrderStatusDB - Update purchase order status in database
func UpdatePurchaseOrderStatusDB(id uint, status string, notes string) error {
	// TODO: Implement logic
	// - Validate status value
	// - Update status and notes in database
	// - Return error if failed
	fmt.Printf("Updating PO status with ID: %d to %s\n", id, status)

	result := DB.Model(&PurchaseOrder{}).
		Where("id = ?", id).
		Updates(PurchaseOrder{
			Status: status,
			Notes:  notes,
		})

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// ============================================================================
// ATTACHMENT DATABASE HELPERS
// ============================================================================

// CreateAttachmentDB - Create attachment record in database
func CreateAttachmentDB(attachment *Attachment) error {
	// TODO: Implement logic
	// - Create attachment record in database
	// - Return error if failed
	fmt.Println("Creating attachment in database")
	result := DB.Create(attachment)

	if result.Error != nil {
		return result.Error
	}
	return nil
}

// GetAttachmentByID - Get attachment by ID from database
func GetAttachmentByID(id uint) (*Attachment, error) {
	// TODO: Implement logic
	// - Query attachment by ID
	// - Return attachment or error if not found
	fmt.Printf("Getting attachment with ID: %d\n", id)

	var dbAttachment Attachment

	result := DB.Model(&Attachment{}).Where("id = ?", id).First(&dbAttachment)

	if result.Error != nil {
		return &Attachment{}, result.Error
	}

	return &dbAttachment, nil
}

// DeleteAttachmentDB - Delete attachment from database (soft delete)
func DeleteAttachmentDB(id uint) error {
	fmt.Printf("Deleting attachment with ID: %d\n", id)

	result := DB.Model(&Attachment{}).Where("id = ?", id).Delete(&Attachment{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("attachment not found")
	}

	return nil
}

// ============================================================================
// COMPANY DATABASE HELPERS
// ============================================================================

// GetCompanyByIDDB - Get company by ID from database
func GetCompanyByIDDB(id uint) (*Company, error) {
	// TODO: Implement logic
	// - Query company by ID
	// - Return company or error if not found
	fmt.Printf("Getting company with ID: %d\n", id)

	var companyfromdb Company

	result := DB.First(&companyfromdb, id)

	if result.Error != nil {
		return &Company{}, result.Error
	}

	return &companyfromdb, nil
}

// UpdateCompanyDB - Update company profile in database
func UpdateCompanyDB(id uint, company *Company) error {
	// TODO: Implement logic
	// - Update company by ID
	// - Return error if not found or failed
	fmt.Printf("Updating company with ID: %d\n", id)

	company.ID = id

	result := DB.Save(company)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// buildCompaniesQuery - Shared filter builder for company lists (used by
// both the count and the page query).
func buildCompaniesQuery(role, search string) *gorm.DB {
	query := DB.Model(&Company{})

	if role != "" {
		query = query.Where("role = ?", role)
	}

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("username ILIKE ? OR company_name ILIKE ? OR email ILIKE ?", like, like, like)
	}

	return query
}

// GetAllCompaniesDB - Get all companies (users), optionally filtered by
// role and/or a case-insensitive search across username/company_name/email,
// paginated and sorted. Returns the page slice plus the total row count.
func GetAllCompaniesDB(role string, search string, page, limit int, sortColumn, direction string) ([]Company, int64, error) {
	var companies []Company
	var total int64

	if err := buildCompaniesQuery(role, search).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	result := buildCompaniesQuery(role, search).
		Order(sortColumn + " " + direction).
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&companies)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return companies, total, nil
}

// UpdateCompanyRoleDB - Update just the role of a company
func UpdateCompanyRoleDB(id uint, role string) error {
	result := DB.Model(&Company{}).Where("id = ?", id).Update("role", role)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("company not found")
	}
	return nil
}

// UpdateCompanyPasswordDB - Update company password in database
func UpdateCompanyPasswordDB(id uint, hashedPassword string) error {
	// TODO: Implement logic
	// - Update password for company by ID
	// - Return error if not found or failed
	fmt.Printf("Updating password for company ID: %d\n", id)

	result := DB.Model(&Company{}).Where("id = ?", id).Update("password", hashedPassword)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// GetCompanyByUsernameDB - Get company by username from database
func GetCompanyByUsernameDB(username string) (*Company, error) {
	// TODO: Implement logic
	// - Query company by username
	// - Return company or error if not found
	fmt.Printf("Getting company with username: %s\n", username)

	var companyfromdb Company

	result := DB.Where("username = ?", username).First(&companyfromdb)

	if result.Error != nil {
		return &Company{}, result.Error
	}

	return &companyfromdb, nil
}

// CheckEmailExists - Check if email already exists
func CheckEmailExists(email string, excludeID uint) bool {
	var count int64
	query := DB.Model(&Company{}).Where("email = ?", email)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	query.Count(&count)
	return count > 0
}

// CheckUsernameExists - Check if username already exists (excluding a given ID, e.g. self during profile update)
func CheckUsernameExists(username string, excludeID uint) bool {
	var count int64
	query := DB.Model(&Company{}).Where("username = ?", username)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	query.Count(&count)
	return count > 0
}

// ValidateCompanyExists - Check if company exists and is not deleted
func ValidateCompanyExists(id uint) bool {
	var count int64
	DB.Model(&Company{}).Where("id = ? AND deleted_at IS NULL", id).Count(&count)
	return count > 0
}

// ValidateAttachmentExists - Check if attachment exists and is not deleted
func ValidateAttachmentExists(id uint) bool {
	var count int64
	DB.Model(&Attachment{}).Where("id = ? AND deleted_at IS NULL", id).Count(&count)
	return count > 0
}

// ValidatePurchaseOrderExists - Check if purchase order exists and is not deleted
func ValidatePurchaseOrderExists(id uint) bool {
	var count int64
	DB.Model(&PurchaseOrder{}).Where("id = ? AND deleted_at IS NULL", id).Count(&count)
	return count > 0
}

// GetPurchaseOrderOwner - Get the company_id that owns a purchase order
func GetPurchaseOrderOwner(poID uint) (uint, error) {
	var po PurchaseOrder
	result := DB.Select("company_id").Where("id = ? AND deleted_at IS NULL", poID).First(&po)
	if result.Error != nil {
		return 0, result.Error
	}
	return po.CompanyID, nil
}

func GetFileOwner(attachmentID uint) (uint, error) {
	var po PurchaseOrder
	result := DB.Model(&PurchaseOrder{}).
		Joins("JOIN purchase_order_attachments poa ON poa.purchase_order_id = purchase_orders.id").
		Where("poa.attachment_id = ? AND purchase_orders.deleted_at IS NULL", attachmentID).
		First(&po)
	if result.Error != nil {
		return 0, result.Error
	}
	return po.CompanyID, nil
}

// GetPOIDFromAttachment - Get purchase order ID from attachment ID
func GetPOIDFromAttachment(attachmentID uint) (uint, error) {
	var po PurchaseOrder
	result := DB.Model(&PurchaseOrder{}).
		Select("purchase_orders.id").
		Joins("JOIN purchase_order_attachments poa ON poa.purchase_order_id = purchase_orders.id").
		Where("poa.attachment_id = ? AND purchase_orders.deleted_at IS NULL", attachmentID).
		First(&po)
	if result.Error != nil {
		return 0, result.Error
	}
	return po.ID, nil
}

// CreateDownloadLog - Log file download
func CreateDownloadLog(log *DownloadLog) error {
	fmt.Println("Creating download log in database")
	result := DB.Create(log)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// CreatePasswordChangeLog - Log password change
func CreatePasswordChangeLog(log *PasswordChange) error {
	fmt.Println("Creating password change log in database")
	result := DB.Create(log)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// CreateProfileChangeLog - Log profile change
func CreateProfileChangeLog(log *ProfileChange) error {
	fmt.Println("Creating profile change log in database")
	result := DB.Create(log)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// ============================================================================
// AUDIT LOG QUERY HELPERS (admin activity log page)
// ============================================================================

// getAuditLogsDB - Shared paginated/sorted query for the read-only audit
// tables. `model` is the GORM model to query and `out` the destination
// slice. Returns the total row count for pagination metadata.
func getAuditLogsDB(model, out interface{}, page, limit int, sortColumn, direction string) (int64, error) {
	var total int64

	if err := DB.Model(model).Count(&total).Error; err != nil {
		return 0, err
	}

	result := DB.Model(model).
		Order(sortColumn + " " + direction).
		Offset((page - 1) * limit).
		Limit(limit).
		Find(out)

	if result.Error != nil {
		return 0, result.Error
	}

	return total, nil
}

// GetProfileChangesDB - Paginated, sorted profile change audit entries.
func GetProfileChangesDB(page, limit int, sortColumn, direction string) ([]ProfileChange, int64, error) {
	var logs []ProfileChange
	total, err := getAuditLogsDB(&ProfileChange{}, &logs, page, limit, sortColumn, direction)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

// GetPasswordChangesDB - Paginated, sorted password change audit entries.
func GetPasswordChangesDB(page, limit int, sortColumn, direction string) ([]PasswordChange, int64, error) {
	var logs []PasswordChange
	total, err := getAuditLogsDB(&PasswordChange{}, &logs, page, limit, sortColumn, direction)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

// GetDownloadLogsDB - Paginated, sorted file download audit entries.
func GetDownloadLogsDB(page, limit int, sortColumn, direction string) ([]DownloadLog, int64, error) {
	var logs []DownloadLog
	total, err := getAuditLogsDB(&DownloadLog{}, &logs, page, limit, sortColumn, direction)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

// POSummary - aggregate purchase order figures for the dashboard.
type POSummary struct {
	Total              int64            `json:"total"`
	CountsByStatus     map[string]int64 `json:"counts_by_status"`
	CompletedThisMonth int64            `json:"completed_this_month"`
	RecentOrders       []PurchaseOrder  `json:"recent_orders"`
}

// AccountSummary - aggregate account figures for the dashboard (admin only).
type AccountSummary struct {
	Total  int64            `json:"total"`
	ByRole map[string]int64 `json:"by_role"`
}

// DashboardSummary - single payload backing every dashboard widget, so the
// dashboard no longer needs to fetch full PO/company lists just to count
// them. `Accounts` is nil for non-admins.
type DashboardSummary struct {
	PurchaseOrders POSummary       `json:"purchase_orders"`
	Accounts       *AccountSummary `json:"accounts,omitempty"`
}

// GetDashboardSummaryDB - Compute the dashboard aggregates. When companyID
// is non-nil the PO figures are scoped to that company (the `user` role);
// includeAccounts adds per-role account counts for admins.
func GetDashboardSummaryDB(companyID *uint, includeAccounts bool) (*DashboardSummary, error) {
	summary := &DashboardSummary{
		PurchaseOrders: POSummary{CountsByStatus: map[string]int64{}},
	}

	// Total + per-status counts in a single grouped query. The sum of the
	// group counts is the overall total.
	type statusCount struct {
		Status string
		Total  int64
	}
	var statusRows []statusCount
	statusQuery := DB.Model(&PurchaseOrder{}).
		Select("status, count(*) AS total").
		Group("status")
	if companyID != nil {
		statusQuery = statusQuery.Where("company_id = ?", *companyID)
	}
	if err := statusQuery.Scan(&statusRows).Error; err != nil {
		return nil, err
	}
	for _, row := range statusRows {
		summary.PurchaseOrders.CountsByStatus[row.Status] = row.Total
		summary.PurchaseOrders.Total += row.Total
	}

	// POs marked complete during the current calendar month. date_trunc is
	// Postgres-specific, which is fine - this app is Postgres-only (see
	// backend/db/schema.sql).
	completedQuery := DB.Model(&PurchaseOrder{}).
		Where("status = ?", "complete").
		Where("updated_at >= date_trunc('month', CURRENT_TIMESTAMP)")
	if companyID != nil {
		completedQuery = completedQuery.Where("company_id = ?", *companyID)
	}
	if err := completedQuery.Count(&summary.PurchaseOrders.CompletedThisMonth).Error; err != nil {
		return nil, err
	}

	// Five most recently updated POs for the "Recent Orders" card. No
	// company preload - the card doesn't display it.
	recentQuery := DB.Model(&PurchaseOrder{}).Order("updated_at DESC").Limit(5)
	if companyID != nil {
		recentQuery = recentQuery.Where("company_id = ?", *companyID)
	}
	if err := recentQuery.Find(&summary.PurchaseOrders.RecentOrders).Error; err != nil {
		return nil, err
	}

	if includeAccounts {
		accounts := &AccountSummary{ByRole: map[string]int64{}}

		type roleCount struct {
			Role  Roles
			Total int64
		}
		var roleRows []roleCount
		if err := DB.Model(&Company{}).
			Select("role, count(*) AS total").
			Group("role").
			Scan(&roleRows).Error; err != nil {
			return nil, err
		}
		for _, row := range roleRows {
			accounts.ByRole[string(row.Role)] = row.Total
			accounts.Total += row.Total
		}

		summary.Accounts = accounts
	}

	return summary, nil
}

