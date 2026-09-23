package api

import (
	"time"

	"gorm.io/gorm"
)

type Roles string

const (
	RoleUser      Roles = "user"
	RoleValidator Roles = "validator"
	RoleAdmin     Roles = "admin"
)

type Company struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Role        Roles          `json:"role" gorm:"type:varchar(50);not null;default:'user'" binding:"required,oneof=user validator admin"`
	Username    string         `json:"username" binding:"required" gorm:"unique;not null"`
	CompanyName string         `json:"company_name" binding:"required" gorm:"not null"`
	Password    string         `json:"password,omitempty" gorm:"not null"`
	Email       string         `json:"email" gorm:"unique;not null"`
	Phone       string         `json:"phone"`
	PhotoPath   string         `json:"photo_path" gorm:"column:photo_path"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

type PurchaseOrder struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	PONumber    string         `json:"po_number" gorm:"not null"`
	CompanyID   uint           `json:"company_id" gorm:"not null"`
	Title       string         `json:"title" gorm:"not null"`
	TotalAmount float64        `json:"total_amount" gorm:"not null;default:0"`
	ResiNumber  string         `json:"resi_number"`
	Notes       string         `json:"notes"`
	Status      string         `json:"status" gorm:"default:verifying"`
	Attachments []Attachment   `json:"attachments,omitempty" gorm:"many2many:purchase_order_attachments;"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

type Attachment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	FileName  string         `json:"filename" gorm:"column:filename;not null"`
	FilePath  string         `json:"filepath" gorm:"column:filepath;not null"`
	MimeType  string         `json:"mime_type" gorm:"column:mime_type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

// PurchaseOrderAttachment - Join table linking purchase orders to their attachments (many-to-many)
type PurchaseOrderAttachment struct {
	PurchaseOrderID uint      `json:"purchase_order_id" gorm:"primaryKey"`
	AttachmentID    uint      `json:"attachment_id" gorm:"primaryKey"`
	CreatedAt       time.Time `json:"created_at"`
}

type HelloRequest struct {
	Message string `json:"message" binding:"required"`
}

type RegisterRequest struct {
	Company Company `json:"company" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token   string  `json:"token"`
	Company Company `json:"company"`
}

type TokenRequest struct {
	Token string `json:"token"`
}

type TokenResponse struct {
	Valid bool `json:"valid"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

type UploadPORequest struct {
	PONumber string `json:"po_number" binding:"required"`
}

type JsonResponse struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type DownloadLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	AttachmentID uint      `json:"attachment_id" gorm:"not null"`
	POID         uint      `json:"po_id" gorm:"not null"`
	IPAddress    string    `json:"ip_address"`
	CreatedAt    time.Time `json:"created_at"`
}

type PasswordChange struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	ChangedAt time.Time `json:"changed_at"`
	IPAddress string    `json:"ip_address"`
}

type ProfileChange struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	FieldName string    `json:"field_name" gorm:"not null"`
	OldValue  string    `json:"old_value"`
	NewValue  string    `json:"new_value"`
	ChangedAt time.Time `json:"changed_at"`
	IPAddress string    `json:"ip_address"`
}

type UpdateCompanyProfileRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	CompanyName string `json:"company_name"`
}

// UpdateCompanyProfileResponse - wraps the updated company plus a freshly
// issued JWT, since username/company_name/email are embedded in the JWT
// claims (see GenerateToken) and would otherwise go stale until the old
// token expires or the user logs in again.
type UpdateCompanyProfileResponse struct {
	Token   string  `json:"token"`
	Company Company `json:"company"`
}
