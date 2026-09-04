package api

import (
	"time"
)

type Company struct {
	ID          uint      `json:"id"`
	Username    string    `json:"username"`
	CompanyName string    `json:"company_name"`
	Password    string    `json:"password,omitempty"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PurchaseOrder struct {
	ID           uint      `json:"id"`
	PONumber     string    `json:"po_number"`
	CompanyID    string    `json:"company_id"`
	AttachmentId uint      `json:"attachment_id"`
	UploadedAt   time.Time `json:"uploaded_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AttachmentId struct {
	ID         uint      `json:"id"`
	FileName   string    `json:"filename"`
	FilePath   string    `json:"filepath"`
	UploadedAt time.Time `json:"uploaded_at"`
	UpdatedAt  time.Time `json:"Updated_at"`
}

type PurchaseOrderHistory struct {
	ID       uint   `json:"id"`
	PO_ID    string `json:"po_id"`
	MimeType string `json:"mime_type"`
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
