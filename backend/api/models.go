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
	// RoleSuperAdmin - a locked-down admin account (e.g. the founder).
	// Behaves like RoleAdmin for access purposes (see RequireAdmin), but:
	//   - can never be demoted or have its password reset by anyone,
	//     including itself, via the API (see AdminUpdateCompanyRole /
	//     AdminResetCompanyPassword in admin_handlers.go).
	//   - can never be assigned to an account through the API (create or
	//     role-change) - the only way to grant it is a manual UPDATE
	//     directly against the database. This is intentional: it prevents
	//     privilege escalation to super_admin from within the app itself.
	RoleSuperAdmin Roles = "super_admin"
)

type Company struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// Role has no binding:"required" tag - Register (public) always
	// overwrites it with RoleUser regardless of what's sent, and
	// AdminCreateCompany defaults it to RoleUser when left blank. Keeping
	// "required" here would reject BindJSON on any request that omits the
	// field before either handler's own logic ever runs.
	// binding oneof includes super_admin only so BindJSON doesn't reject a
	// payload that happens to carry it (e.g. GET /companies responses fed
	// back through a form) - AdminCreateCompany/AdminUpdateCompanyRole
	// still explicitly reject attempts to *assign* super_admin via the API.
	Role        Roles          `json:"role" gorm:"type:varchar(50);not null;default:'user'" binding:"omitempty,oneof=user validator admin super_admin"`
	Username    string         `json:"username" binding:"required" gorm:"unique;not null"`
	// CompanyName has no binding:"required" tag - it IS required for
	// public self-registration (see Register in auth_handlers.go, which
	// enforces it manually) but is optional when an admin creates another
	// admin account (see AdminCreateCompany in admin_handlers.go, which
	// defaults it to the username when left blank).
	CompanyName string `json:"company_name" gorm:"not null"`
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
	// Company - the requesting company, preloaded (without password, see
	// stripPurchaseOrdersCompanyPassword) so validator/admin tables can
	// display who submitted each PO without a second lookup.
	Company     *Company       `json:"company,omitempty" gorm:"foreignKey:CompanyID;references:ID"`
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
	ID     uint `json:"id" gorm:"primaryKey"`
	UserID uint `json:"user_id" gorm:"not null"`
	// ChangedAt needs gorm:"autoCreateTime" because GORM only
	// auto-populates timestamp fields literally named CreatedAt/UpdatedAt
	// by convention - any other field name (like ChangedAt here) is left
	// as the Go zero value (0001-01-01) unless explicitly tagged.
	ChangedAt time.Time `json:"changed_at" gorm:"autoCreateTime"`
	IPAddress string    `json:"ip_address"`
}

type ProfileChange struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	UserID    uint   `json:"user_id" gorm:"not null"`
	FieldName string `json:"field_name" gorm:"not null"`
	OldValue  string `json:"old_value"`
	NewValue  string `json:"new_value"`
	// See PasswordChange.ChangedAt above for why autoCreateTime is needed.
	ChangedAt time.Time `json:"changed_at" gorm:"autoCreateTime"`
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

// PasswordReset - a one-time-use, expiring token issued when a locked-out
// user requests a password reset via email (see ForgotPassword/
// ResetPassword in forgot_password_handlers.go). Only a SHA-256 hash of
// the raw token is stored (TokenHash) - never the raw token itself - so a
// leaked database dump can't be used to reset anyone's password; the raw
// token only ever exists in the email link and briefly in memory while
// handling the request.
type PasswordReset struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"not null"`
	TokenHash string     `json:"-" gorm:"column:token_hash;not null;uniqueIndex"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	IPAddress string     `json:"ip_address"`
	CreatedAt time.Time  `json:"created_at"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}
