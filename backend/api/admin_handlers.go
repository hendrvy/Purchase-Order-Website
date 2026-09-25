package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// ADMIN-ONLY COMPANY (USER) MANAGEMENT
//
// All handlers in this file are mounted under routes gated to
// role == "admin" only (see backend/cmd/main.go). Validators do not get
// access to user management, only to PO status updates.
// ============================================================================

// AdminListCompanies - List all companies/users, optionally filtered by
// role (?role=user|validator|admin) and/or search (?search=...).
func AdminListCompanies(c *gin.Context) {
	role := c.Query("role")
	search := strings.TrimSpace(c.Query("search"))

	if role != "" && !IsValidRole(role) {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid role filter",
			Message: "role must be one of: user, validator, admin",
		})
		return
	}

	companies, err := GetAllCompaniesDB(role, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to retrieve companies",
		})
		return
	}

	for i := range companies {
		companies[i].Password = ""
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved companies",
		Data:    companies,
	})
}

// AdminCreateCompany - Create a new company/user account with an explicit
// role (user, validator, or admin). Unlike the public Register endpoint,
// the caller here is already an authenticated admin, so the role field is
// trusted.
func AdminCreateCompany(c *gin.Context) {
	var req RegisterRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	company := req.Company

	if company.Username == "" || company.Password == "" || company.Email == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Missing required fields",
			Error:   "Username, password, and email are required",
		})
		return
	}

	if company.Role == "" {
		company.Role = RoleUser
	}

	if !IsValidRole(string(company.Role)) {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid role",
			Error:   "role must be one of: user, validator, admin",
		})
		return
	}

	// super_admin can never be assigned through the API, even by an
	// existing admin - the only way to grant it is a manual UPDATE
	// directly against the database. See RoleSuperAdmin in models.go.
	if company.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Cannot create a super_admin account",
			Error:   "Role super_admin can only be granted via direct database access",
		})
		return
	}

	// Company name is only mandatory for "user" accounts (a user account
	// represents an actual client company placing purchase orders).
	// Validator/admin accounts are internal staff, so fall back to the
	// username when left blank.
	if company.CompanyName == "" {
		if company.Role == RoleUser {
			c.JSON(http.StatusBadRequest, JsonResponse{
				Status:  http.StatusBadRequest,
				Message: "Missing required fields",
				Error:   "company_name is required for user accounts",
			})
			return
		}
		company.CompanyName = company.Username
	}

	if !strings.Contains(company.Email, "@") {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid email format",
			Error:   "Email must be a valid email address",
		})
		return
	}

	if CheckUsernameExists(company.Username, 0) {
		c.JSON(http.StatusConflict, JsonResponse{
			Status:  http.StatusConflict,
			Message: "Failed to create account",
			Error:   "Username already exists",
		})
		return
	}

	if CheckEmailExists(company.Email, 0) {
		c.JSON(http.StatusConflict, JsonResponse{
			Status:  http.StatusConflict,
			Message: "Failed to create account",
			Error:   "Email already registered",
		})
		return
	}

	hashedPassword, err := HashPassword(company.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to create account",
			Error:   "Failed to process password",
		})
		return
	}
	company.Password = hashedPassword

	if result := DB.Create(&company); result.Error != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to create account",
			Error:   result.Error.Error(),
		})
		return
	}

	company.Password = ""

	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "Account created successfully",
		Data:    company,
	})
}

// AdminUpdateCompanyRole - Change the role of an existing company/user.
type UpdateCompanyRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

func AdminUpdateCompanyRole(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	if _, err := fmt.Sscanf(companyIDstr, "%d", &companyID); err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	var req UpdateCompanyRoleRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if !IsValidRole(req.Role) {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid role",
			Error:   "role must be one of: user, validator, admin",
		})
		return
	}

	// super_admin can never be assigned through the API - see
	// RoleSuperAdmin in models.go.
	if Roles(req.Role) == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Cannot assign super_admin role",
			Error:   "Role super_admin can only be granted via direct database access",
		})
		return
	}

	adminID := c.GetUint("user_id")
	if companyID == adminID {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Cannot change your own role",
			Error:   "Ask another admin to change your role",
		})
		return
	}

	company, err := GetCompanyByIDDB(companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Company not found",
			Message: "No company with that ID",
		})
		return
	}

	// A super_admin's role can never be changed by anyone, including
	// another super_admin - it's permanently locked once granted (only
	// undoable via direct database access). See RoleSuperAdmin in
	// models.go.
	if company.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Cannot change role of a super_admin account",
			Error:   "This account's role is permanently locked",
		})
		return
	}

	oldRole := string(company.Role)

	if err := UpdateCompanyRoleDB(companyID, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to update role",
		})
		return
	}

	changeLog := ProfileChange{
		UserID:    companyID,
		FieldName: "role",
		OldValue:  oldRole,
		NewValue:  req.Role,
		IPAddress: c.ClientIP(),
	}
	CreateProfileChangeLog(&changeLog)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Role updated successfully",
		Data: map[string]interface{}{
			"id":   companyID,
			"role": req.Role,
		},
	})
}

// AdminResetCompanyPassword - Set a new password for another company/user
// account without requiring the current password (admin override, e.g.
// when a user has forgotten their password).
type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required"`
}

func AdminResetCompanyPassword(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	if _, err := fmt.Sscanf(companyIDstr, "%d", &companyID); err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	var req AdminResetPasswordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid password",
			Error:   "new_password must be at least 6 characters",
		})
		return
	}

	targetCompany, err := GetCompanyByIDDB(companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Company not found",
			Message: "No company with that ID",
		})
		return
	}

	// A super_admin's password can never be reset by anyone else - only
	// the super_admin themselves can change it, via the normal
	// ChangePassword flow (which requires their current password). See
	// RoleSuperAdmin in models.go.
	if targetCompany.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Cannot reset password of a super_admin account",
			Error:   "This account's password can only be changed by the account owner",
		})
		return
	}

	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to reset password",
			Error:   "Failed to process new password",
		})
		return
	}

	if err := UpdateCompanyPasswordDB(companyID, hashedPassword); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to reset password",
			Error:   err.Error(),
		})
		return
	}

	passwordLog := PasswordChange{
		UserID:    companyID,
		IPAddress: c.ClientIP(),
	}
	CreatePasswordChangeLog(&passwordLog)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Password reset successfully",
	})
}

// ============================================================================
// ADMIN ACTIVITY LOG (AUDIT) ENDPOINTS
// ============================================================================

// AdminGetProfileChangeLogs - List profile change audit entries
func AdminGetProfileChangeLogs(c *gin.Context) {
	limit := queryInt(c, "limit", 100)
	logs, err := GetAllProfileChangesDB(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to retrieve profile change logs",
		})
		return
	}
	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved profile change logs",
		Data:    logs,
	})
}

// AdminGetPasswordChangeLogs - List password change audit entries
func AdminGetPasswordChangeLogs(c *gin.Context) {
	limit := queryInt(c, "limit", 100)
	logs, err := GetAllPasswordChangesDB(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to retrieve password change logs",
		})
		return
	}
	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved password change logs",
		Data:    logs,
	})
}

// AdminGetDownloadLogs - List file download audit entries
func AdminGetDownloadLogs(c *gin.Context) {
	limit := queryInt(c, "limit", 100)
	logs, err := GetAllDownloadLogsDB(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to retrieve download logs",
		})
		return
	}
	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved download logs",
		Data:    logs,
	})
}
