package api

import (
	"fmt"
	"net/http"

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

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Company profile updated successfully",
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
