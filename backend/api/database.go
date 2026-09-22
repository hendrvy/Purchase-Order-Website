package api

import (
	"fmt"
)

// GetAllPurchaseOrdersDB - Get all purchase orders from database
func GetAllPurchaseOrdersDB(page int, limit int) ([]PurchaseOrder, error) {
	var purchaseOrder []PurchaseOrder

	result := DB.Preload("Attachments").Where("deleted_at IS NULL").Offset((page - 1) * limit).Limit(limit).Find(&purchaseOrder)

	if result.Error != nil {
		return nil, result.Error
	}

	return purchaseOrder, nil
}

// GetPurchaseOrderByIDDB - Get purchase order by ID from database
func GetPurchaseOrderByIDDB(id uint) (*PurchaseOrder, error) {
	fmt.Printf("Getting purchase order with ID: %d\n", id)

	var poByID PurchaseOrder

	result := DB.Preload("Attachments").First(&poByID, id)

	if result.Error != nil {
		return nil, result.Error
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

// GetPurchaseOrdersByCompanyDB - Get all purchase orders for a company
func GetPurchaseOrdersByCompanyDB(companyID uint) ([]PurchaseOrder, error) {
	fmt.Printf("Getting purchase orders for company ID: %d\n", companyID)

	var poByCompany []PurchaseOrder
	result := DB.Preload("Attachments").Where("company_id = ? AND deleted_at IS NULL", companyID).Find(&poByCompany)

	if result.Error != nil {
		return nil, result.Error
	}

	return poByCompany, nil
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
