package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func DBConnect() *gorm.DB {
	var dsn string = "host=postgres user=smsadmin123 password=puderpuder123 dbname=Purchase-Order-Website port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect to database")
	}

	DB = db
	return db
}

func HelloIn(c *gin.Context) {
	var helloReq HelloRequest
	if err := c.BindJSON(&helloReq); err != nil {
		c.JSON(400, gin.H{"error": "False input field"})
	}

	if helloReq.Message != "" {
		c.JSON(200, HelloRequest{
			Message: "Hello from server! You said : " + helloReq.Message,
		})
	}
}

func InsertCompany(c *gin.Context) {
	var companyReq CompanyRequest
	if err := c.BindJSON(&companyReq); err != nil {
		c.JSON(400, gin.H{"error": "not a Company data request"})
	}

	if companyReq.Company.CompanyName != "" {
		c.JSON(200, gin.H{"message": "Company data acquired \n" + companyReq.Company.CompanyName})
	}

}

func Login(c *gin.Context) {
	var logReq LoginRequest

	// Validate request body
	if err := c.BindJSON(&logReq); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	// Validate required fields
	if logReq.Username == "" || logReq.Password == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Username and password are required",
			Error:   "Missing required fields",
		})
		return
	}

	// Find user in database
	var user Company
	if result := DB.Where("username = ?", logReq.Username).First(&user); result.Error != nil {
		fmt.Println("Login failed: User not found - " + logReq.Username)
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Message: "Authentication failed",
			Error:   "Username or password is incorrect",
		})
		return
	}

	// Verify password (compare hashed password)
	if !VerifyPassword(user.Password, logReq.Password) {
		fmt.Println("Login failed: Invalid password - " + logReq.Username)
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Message: "Authentication failed",
			Error:   "Username or password is incorrect",
		})
		return
	}

	// Generate JWT token
	token, err := GenerateToken(user)
	if err != nil {
		fmt.Println("Login failed: Token generation error - " + err.Error())
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to generate authentication token",
			Error:   err.Error(),
		})
		return
	}

	// Return success response
	response := LoginResponse{
		Token: token,
		Company: Company{
			ID:          user.ID,
			Username:    user.Username,
			CompanyName: user.CompanyName,
			Email:       user.Email,
		},
	}

	fmt.Printf("Login successful: %s (ID: %d)\n", user.Username, user.ID)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Login successful",
		Data:    response,
	})
}

func AuthenticateToken(c *gin.Context) {
	var authenReq TokenRequest

	// Validate request body
	if err := c.BindJSON(&authenReq); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	// Validate token field
	if authenReq.Token == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Token is required",
			Error:   "Missing token field",
		})
		return
	}

	// Validate token
	data, err := ValidateToken(authenReq.Token)
	if err != nil {
		fmt.Printf("Token validation failed: %s\n", err.Error())
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Message: "Invalid or expired token",
			Error:   err.Error(),
		})
		return
	}

	// Extract claims
	username, _ := data["username"].(string)

	fmt.Printf("Token validation successful for user: %s\n", username)

	// Return success response
	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Token is valid",
		Data: TokenResponse{
			Valid: true,
		},
	})
}

func Register(c *gin.Context) {
	var registReq RegisterRequest

	// Validate request body
	if err := c.BindJSON(&registReq); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	company := registReq.Company

	// Validate required fields
	if company.Username == "" || company.Password == "" || company.CompanyName == "" || company.Email == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Missing required fields",
			Error:   "Username, password, company name, and email are required",
		})
		return
	}

	// Validate email format (basic validation)
	if !strings.Contains(company.Email, "@") {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid email format",
			Error:   "Email must be a valid email address",
		})
		return
	}

	// Check if username already exists
	var existingUser Company
	if result := DB.Where("username = ?", company.Username).First(&existingUser); result.RowsAffected > 0 {
		c.JSON(http.StatusConflict, JsonResponse{
			Status:  http.StatusConflict,
			Message: "Registration failed",
			Error:   "Username already exists",
		})
		return
	}

	// Check if email already exists
	if result := DB.Where("email = ?", company.Email).First(&existingUser); result.RowsAffected > 0 {
		c.JSON(http.StatusConflict, JsonResponse{
			Status:  http.StatusConflict,
			Message: "Registration failed",
			Error:   "Email already registered",
		})
		return
	}

	// Hash password
	hashedPassword, err := HashPassword(company.Password)
	if err != nil {
		fmt.Println("Registration failed: Password hashing error - " + err.Error())
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Registration failed",
			Error:   "Failed to process password",
		})
		return
	}

	company.Password = hashedPassword

	// Create company in database
	if result := DB.Create(&company); result.Error != nil {
		fmt.Println("Registration failed: Database error - " + result.Error.Error())
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Registration failed",
			Error:   result.Error.Error(),
		})
		return
	}

	fmt.Printf("Registration successful: %s (ID: %d)\n", company.Username, company.ID)

	// Return success response (exclude password)
	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "Company registered successfully",
		Data: map[string]interface{}{
			"id":           company.ID,
			"username":    company.Username,
			"company_name": company.CompanyName,
			"email":        company.Email,
			"phone":        company.Phone,
		},
	})
}

// ============================================================================
// PURCHASE ORDER HANDLERS
// ============================================================================

// GetPurchaseOrders - Get all purchase orders
func GetPurchaseOrders(c *gin.Context) {
	// TODO: Implement logic
	// - Query all purchase orders from database
	// - Return list with pagination support
	c.JSON(http.StatusOK, gin.H{"message": "Get all purchase orders"})
}

// GetPurchaseOrderByID - Get purchase order by ID
func GetPurchaseOrderByID(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Query purchase order by ID
	// - Return purchase order details
	poID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Get purchase order", "id": poID})
}

// CreatePurchaseOrder - Create new purchase order
func CreatePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Bind JSON request body
	// - Validate required fields
	// - Create purchase order in database
	// - Return created purchase order with ID
	c.JSON(http.StatusCreated, gin.H{"message": "Purchase order created successfully"})
}

// UpdatePurchaseOrder - Update purchase order
func UpdatePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Bind JSON request body
	// - Validate data
	// - Update purchase order in database
	// - Return updated purchase order
	poID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Purchase order updated", "id": poID})
}

// DeletePurchaseOrder - Delete purchase order
func DeletePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Soft delete purchase order from database
	// - Delete associated attachment file
	// - Return success message
	poID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Purchase order deleted", "id": poID})
}

// ============================================================================
// PURCHASE ORDER STATUS HANDLERS
// ============================================================================

// UpdatePurchaseOrderStatus - Update purchase order status
func UpdatePurchaseOrderStatus(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Bind POStatusUpdate request
	// - Validate status value (pending, processed, done)
	// - Update status in database
	// - Return updated purchase order
	poID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Purchase order status updated", "id": poID})
}

// GetPurchaseOrdersByCompany - Get all purchase orders for a company
func GetPurchaseOrdersByCompany(c *gin.Context) {
	// TODO: Implement logic
	// - Get company_id from URL parameter
	// - Query all purchase orders for the company
	// - Support filtering by status
	// - Support pagination
	// - Return list of purchase orders
	companyID := c.Param("company_id")
	c.JSON(http.StatusOK, gin.H{"message": "Get purchase orders by company", "company_id": companyID})
}

// ============================================================================
// FILE UPLOAD/DOWNLOAD HANDLERS
// ============================================================================

// UploadFile - Upload file attachment
func UploadFile(c *gin.Context) {
	// TODO: Implement logic
	// - Get file from multipart form
	// - Validate file type and size
	// - Save file to storage
	// - Create attachment record in database
	// - Return attachment ID and file info
	c.JSON(http.StatusCreated, gin.H{"message": "File uploaded successfully"})
}

// DownloadFile - Download file attachment
func DownloadFile(c *gin.Context) {
	// TODO: Implement logic
	// - Get attachment ID from URL parameter
	// - Query attachment from database
	// - Retrieve file from storage
	// - Return file with proper headers
	// - Handle file not found error
	attachmentID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Download file", "attachment_id": attachmentID})
}

// ============================================================================
// COMPANY HANDLERS
// ============================================================================

// GetCompanyByID - Get company details
func GetCompanyByID(c *gin.Context) {
	// TODO: Implement logic
	// - Get company ID from URL parameter
	// - Query company from database
	// - Return company details (exclude password)
	// - Handle company not found error
	companyID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Get company details", "id": companyID})
}

// UpdateCompanyProfile - Update company profile
func UpdateCompanyProfile(c *gin.Context) {
	// TODO: Implement logic
	// - Get company ID from URL parameter
	// - Bind JSON request body
	// - Validate data (email, phone uniqueness)
	// - Update company in database
	// - Return updated company (exclude password)
	companyID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Company profile updated", "id": companyID})
}

// ChangePassword - Change company password
func ChangePassword(c *gin.Context) {
	// TODO: Implement logic
	// - Bind ChangePasswordRequest
	// - Verify current password is correct
	// - Hash new password
	// - Update password in database
	// - Return success message
	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
