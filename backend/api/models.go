package api

import (
	"time"

	"gorm.io/gorm"
)

type Company struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Username    string         `json:"username" binding:"required" gorm:"unique;not null"`
	CompanyName string         `json:"company_name" binding:"required" gorm:"not null"`
	Password    string         `json:"password,omitempty" gorm:"not null"`
	Email       string         `json:"email" gorm:"unique;not null"`
	Phone       string         `json:"phone"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

type PurchaseOrder struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	PONumber     string         `json:"po_number" gorm:"not null"`
	CompanyID    uint           `json:"company_id" gorm:"not null"`
	AttachmentID uint           `json:"attachment_id" gorm:"not null"`
	ResiNumber   string         `json:"resi_number"`
	Status       string         `json:"status" gorm:"default:verifying"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

type Attachment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	FileName  string         `json:"filename" gorm:"not null"`
	FilePath  string         `json:"filepath" gorm:"not null"`
	MimeType  string         `json:"mime_type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
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

type POStatusUpdate struct {
	Status string `json:"status" binding:"required,oneof=pending processed done"`
	Notes  string `json:"notes"`
}

type CompanyRequest struct {
	Company Company `json:"company" binding:"required"`
}
