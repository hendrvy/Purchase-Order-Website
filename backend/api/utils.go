package api

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// ============================================================================
// FILE UPLOAD VALIDATION CONSTANTS
// ============================================================================

const (
	MaxFileSize         = 5 * 1024 * 1024 // 5MB
	MaxAttachmentsPerPO = 10              // Maximum attachments allowed per purchase order
	MaxPhotoSize        = 2 * 1024 * 1024 // 2MB - profile photos should be small
)

var (
	AllowedMimeTypes = map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/png":       true,
		"image/jpg":       true,
		"image/webp":      true,
	}
)

// ============================================================================
// FILE VALIDATION FUNCTIONS
// ============================================================================

// ValidateFile - Validate file before upload
// Returns error if file is invalid
func ValidateFile(file *multipart.FileHeader) error {
	// Check if file is nil
	if file == nil {
		return fmt.Errorf("file is required")
	}

	// Check file size
	if file.Size > MaxFileSize {
		return fmt.Errorf("file size exceeds %dMB limit. Maximum: %d bytes, Received: %d bytes",
			MaxFileSize/1024/1024, MaxFileSize, file.Size)
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !isAllowedExtension(ext) {
		return fmt.Errorf("file type '%s' is not allowed. Allowed types: .pdf, .jpg, .jpeg, .png, .webp", ext)
	}

	return nil
}

// isAllowedExtension - Check if file extension is allowed
func isAllowedExtension(ext string) bool {
	allowedExts := map[string]bool{
		".pdf":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}
	return allowedExts[ext]
}

// isAllowedImageExtension - Check if file extension is an allowed image type
// (stricter than isAllowedExtension - excludes PDF, used for profile photos).
func isAllowedImageExtension(ext string) bool {
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}
	return allowedExts[ext]
}

// ValidateImageFile - Validate an image file before upload (used for
// profile photos). Stricter than ValidateFile: rejects PDFs and enforces
// the smaller MaxPhotoSize limit.
func ValidateImageFile(file *multipart.FileHeader) error {
	if file == nil {
		return fmt.Errorf("file is required")
	}

	if file.Size > MaxPhotoSize {
		return fmt.Errorf("file size exceeds %dMB limit. Maximum: %d bytes, Received: %d bytes",
			MaxPhotoSize/1024/1024, MaxPhotoSize, file.Size)
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !isAllowedImageExtension(ext) {
		return fmt.Errorf("file type '%s' is not allowed. Allowed types: .jpg, .jpeg, .png, .webp", ext)
	}

	return nil
}

// GetMimeType - Get MIME type from file extension
func GetMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeTypes := map[string]string{
		".pdf":  "application/pdf",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".webp": "image/webp",
	}
	if mime, exists := mimeTypes[ext]; exists {
		return mime
	}
	return "application/octet-stream"
}

// ============================================================================
// FILENAME GENERATION
// ============================================================================

// GenerateUniqueFilename - Generate a unique filename using UUID
// Input: "invoice.pdf"
// Output: "550e8400-e29b-41d4-a716-446655440000_invoice.pdf"
func GenerateUniqueFilename(originalFilename string) string {
	// Get file extension
	ext := filepath.Ext(originalFilename)

	// Get filename without extension
	nameWithoutExt := strings.TrimSuffix(originalFilename, ext)

	// Generate UUID
	uniqueID := uuid.New().String()

	// Combine: UUID_originalname.ext
	return fmt.Sprintf("%s_%s%s", uniqueID, nameWithoutExt, ext)
}

// ============================================================================
// PO FIELD VALIDATION
// ============================================================================

// ValidatePOFields - Validate purchase order fields
func ValidatePOFields(poNumber string, status string) error {
	// Check po_number
	if poNumber == "" {
		return fmt.Errorf("po_number is required")
	}

	// Check status (if provided)
	if status != "" {
		validStatuses := []string{"verifying", "process", "shipping", "complete", "rejected"}
		isValid := false
		for _, s := range validStatuses {
			if status == s {
				isValid = true
				break
			}
		}
		if !isValid {
			return fmt.Errorf("invalid status '%s'. Allowed values: verifying, process, shipping, complete, rejected", status)
		}
	}

	return nil
}

// ValidatePOCreateFields - Validate fields required when creating a purchase order
func ValidatePOCreateFields(poNumber string, title string, totalAmount float64, status string) error {
	if err := ValidatePOFields(poNumber, status); err != nil {
		return err
	}

	if title == "" {
		return fmt.Errorf("title is required")
	}

	if totalAmount <= 0 {
		return fmt.Errorf("total_amount is required and must be greater than 0")
	}

	return nil
}

// ============================================================================
// PO STATUS TRANSITION RULES
// ============================================================================

// allowedStatusTransitions - Mirrors the client-side rules in
// frontend/src/lib/status.js TRANSITION_RULES. Kept as the backend source
// of truth so status changes can never skip steps even via direct API
// calls, regardless of what the frontend sends.
var allowedStatusTransitions = map[string][]string{
	"verifying": {"process", "rejected"},
	"process":   {"shipping"},
	"shipping":  {"complete"},
	"complete":  {},
	"rejected":  {},
}

// ValidateStatusTransition - Check that moving a PO from currentStatus to
// newStatus is a legal transition.
func ValidateStatusTransition(currentStatus string, newStatus string) error {
	allowed, ok := allowedStatusTransitions[currentStatus]
	if !ok {
		return fmt.Errorf("unknown current status '%s'", currentStatus)
	}

	for _, s := range allowed {
		if s == newStatus {
			return nil
		}
	}

	return fmt.Errorf("cannot transition purchase order from '%s' to '%s'", currentStatus, newStatus)
}

// ============================================================================
// ROLE VALIDATION
// ============================================================================

// IsValidRole - Check that a role string is one of the known roles.
// Note: this only checks the role is *recognized* (e.g. valid as a
// ?role= filter) - it does NOT mean the role can be freely assigned.
// super_admin in particular can never be assigned through the API; see
// AdminCreateCompany/AdminUpdateCompanyRole in admin_handlers.go.
func IsValidRole(role string) bool {
	switch Roles(role) {
	case RoleUser, RoleValidator, RoleAdmin, RoleSuperAdmin:
		return true
	default:
		return false
	}
}
