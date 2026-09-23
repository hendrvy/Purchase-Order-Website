package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// GetCompanyByID - Get company profile by ID
func GetCompanyByID(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)

	if err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only view your own profile",
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

	company.Password = ""

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Company retrieved successfully",
		Data:    company,
	})
}

// UpdateCompanyProfile - Update company profile (email, phone, company name)
func UpdateCompanyProfile(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)

	if err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only update your own profile",
		})
		return
	}

	var req UpdateCompanyProfileRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid request format",
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

	ipAddress := c.ClientIP()
	identityChanged := false

	if req.Username != "" && req.Username != company.Username {
		if CheckUsernameExists(req.Username, companyID) {
			c.JSON(http.StatusConflict, JsonResponse{
				Status:  http.StatusConflict,
				Error:   "Username already taken",
				Message: "Cannot update to existing username",
			})
			return
		}
		changeLog := ProfileChange{
			UserID:    companyID,
			FieldName: "username",
			OldValue:  company.Username,
			NewValue:  req.Username,
			IPAddress: ipAddress,
		}
		CreateProfileChangeLog(&changeLog)
		company.Username = req.Username
		identityChanged = true
	}

	if req.Email != "" && req.Email != company.Email {
		if CheckEmailExists(req.Email, companyID) {
			c.JSON(http.StatusConflict, JsonResponse{
				Status:  http.StatusConflict,
				Error:   "Email already registered",
				Message: "Cannot update to existing email",
			})
			return
		}
		changeLog := ProfileChange{
			UserID:    companyID,
			FieldName: "email",
			OldValue:  company.Email,
			NewValue:  req.Email,
			IPAddress: ipAddress,
		}
		CreateProfileChangeLog(&changeLog)
		company.Email = req.Email
		identityChanged = true
	}

	if req.Phone != "" && req.Phone != company.Phone {
		changeLog := ProfileChange{
			UserID:    companyID,
			FieldName: "phone",
			OldValue:  company.Phone,
			NewValue:  req.Phone,
			IPAddress: ipAddress,
		}
		CreateProfileChangeLog(&changeLog)
		company.Phone = req.Phone
	}

	if req.CompanyName != "" && req.CompanyName != company.CompanyName {
		changeLog := ProfileChange{
			UserID:    companyID,
			FieldName: "company_name",
			OldValue:  company.CompanyName,
			NewValue:  req.CompanyName,
			IPAddress: ipAddress,
		}
		CreateProfileChangeLog(&changeLog)
		company.CompanyName = req.CompanyName
		identityChanged = true
	}

	if err := UpdateCompanyDB(companyID, company); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to update company profile",
		})
		return
	}

	company.Password = ""

	// username/company_name/email are embedded in the JWT claims - reissue
	// a fresh token whenever one of them changes so the frontend can swap
	// it in and avoid stale claims until the old token expires.
	var newToken string
	if identityChanged {
		token, err := GenerateToken(*company)
		if err != nil {
			c.JSON(http.StatusInternalServerError, JsonResponse{
				Status:  http.StatusInternalServerError,
				Error:   err.Error(),
				Message: "Profile updated but failed to refresh session token",
			})
			return
		}
		newToken = token
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Company profile updated successfully",
		Data: UpdateCompanyProfileResponse{
			Token:   newToken,
			Company: *company,
		},
	})
}

// UploadCompanyPhoto - Upload/replace a company's profile photo
func UploadCompanyPhoto(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)

	if err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only update your own profile",
		})
		return
	}

	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Bad Request, No File upload",
			Message: "Photo file is required",
		})
		return
	}

	if err := ValidateImageFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid photo file",
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

	newFileName := GenerateUniqueFilename(file.Filename)
	dst := filepath.Join(folderPath, newFileName)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to save photo to backend",
		})
		return
	}

	oldPhotoPath := company.PhotoPath
	company.PhotoPath = newFileName

	if err := UpdateCompanyDB(companyID, company); err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to save photo reference",
		})
		return
	}

	// Best-effort cleanup of the previous photo file (ignore errors - e.g.
	// already missing).
	if oldPhotoPath != "" {
		os.Remove(filepath.Join(folderPath, oldPhotoPath))
	}

	company.Password = ""

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Profile photo updated successfully",
		Data:    company,
	})
}

// DeleteCompanyPhoto - Remove a company's profile photo
func DeleteCompanyPhoto(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)

	if err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only update your own profile",
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

	oldPhotoPath := company.PhotoPath
	company.PhotoPath = ""

	if err := UpdateCompanyDB(companyID, company); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to remove photo reference",
		})
		return
	}

	if oldPhotoPath != "" {
		os.Remove(filepath.Join(folderPath, oldPhotoPath))
	}

	company.Password = ""

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Profile photo removed successfully",
		Data:    company,
	})
}

// ChangePassword - Change company password with validation
func ChangePassword(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Error:   "Unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req ChangePasswordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid request format",
		})
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Missing required fields",
			Message: "Current and new password are required",
		})
		return
	}

	company, err := GetCompanyByIDDB(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Company not found",
			Message: "User not found",
		})
		return
	}

	if !VerifyPassword(company.Password, req.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Error:   "Invalid current password",
			Message: "Current password is incorrect",
		})
		return
	}

	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to process new password",
		})
		return
	}

	if err := UpdateCompanyPasswordDB(userID, hashedPassword); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to update password",
		})
		return
	}

	ipAddress := c.ClientIP()
	passwordLog := PasswordChange{
		UserID:    userID,
		IPAddress: ipAddress,
	}
	CreatePasswordChangeLog(&passwordLog)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Password changed successfully",
	})
}

// GetCompanyPhoto - Serve a company's profile photo file. Any authenticated
// user can view any other company's photo (it's a display avatar, not
// sensitive data), unlike PO attachments which are access-controlled.
func GetCompanyPhoto(c *gin.Context) {
	companyIDstr := c.Param("id")
	var companyID uint
	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)

	if err != nil || companyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid company ID",
			Message: "ID must be a valid positive number",
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

	if company.PhotoPath == "" {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "No photo",
			Message: "This company has no profile photo set",
		})
		return
	}

	filePath := filepath.Join(folderPath, company.PhotoPath)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "File not found on disk",
			Message: "The photo has been deleted",
		})
		return
	}

	c.Header("Content-Disposition", "inline")
	c.Header("Content-Type", GetMimeType(company.PhotoPath))
	c.File(filePath)
}
