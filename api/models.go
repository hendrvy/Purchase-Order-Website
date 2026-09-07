package api

import (
	"time"
)

type Company struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	CompanyName string     `json:"company_name"`
	Password    string     `json:"password,omitempty"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type PurchaseOrder struct {
	ID           uint       `json:"id"`
	PONumber     string     `json:"po_number"`
	CompanyID    uint       `json:"company_id"`
	AttachmentID uint       `json:"attachment_id"`
	ResiNumber   string     `json:"resi_number"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

type Attachment struct {
	ID        uint       `json:"id"`
	FileName  string     `json:"filename"`
	FilePath  string     `json:"filepath"`
	MimeType  string     `json:"mime_type"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

type HelloRequest struct {
	Message string `json:"message" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token   string  `json:"token"`
	Company Company `json:"company"`
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
