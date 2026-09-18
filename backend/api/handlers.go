package api

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var folderPath string = "/app/uploads"

func DBConnect() *gorm.DB {
	var dsn string = "host=localhost user=smsadmin123 password=puderpuder123 dbname=Purchase-Order-Website port=5432 sslmode=disable"
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
			Role:        user.Role,
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
	if company.Username == "" || company.Password == "" || company.CompanyName == "" || company.Email == "" || company.Role == "" {
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
			"username":     company.Username,
			"company_name": company.CompanyName,
			"email":        company.Email,
			"phone":        company.Phone,
			"role":         company.Role,
		},
	})
}

func queryInt(c *gin.Context, key string, defaultVal int) int {
	val := c.DefaultQuery(key, "")
	if val == "" {
		return defaultVal
	}
	var result int
	fmt.Sscanf(val, "%d", &result)
	if result < 1 {
		return defaultVal
	}
	return result
}

// ============================================================================
// PURCHASE ORDER HANDLERS
// ============================================================================

// GetPurchaseOrders - Get all purchase orders
func GetPurchaseOrders(c *gin.Context) {
	// TODO: Implement logic
	// - Query all purchase orders from database
	// - Return list with pagination support
	var purchaseOrders []PurchaseOrder

	switch c.GetString("role") {
	case "user":
		GetPurchaseOrdersByCompany(c)
		return
	}

	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 10)

	purchaseOrders, err := GetAllPurchaseOrdersDB(page, limit)

	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to retrieve purchase orders",
			Error:   err.Error(),
		})

		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved purchase orders",
		Data:    purchaseOrders,
	})
}

// GetPurchaseOrderByID - Get purchase order by ID
func GetPurchaseOrderByID(c *gin.Context) {
	// TODO: Implement logic

	poIDstr := c.Param("id")
	var poID uint

	fmt.Sscanf(poIDstr, "%d", &poID)

	purchaseOrder, err := GetPurchaseOrderByIDDB(uint(poID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to retrieve purchase orders",
			Error:   err.Error(),
		})

		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Purchase order retrieved successfully",
		Data:    purchaseOrder,
	})
}

// CreatePurchaseOrder - Create new purchase order
func CreatePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Bind JSON request body
	// - require formfile
	// - Validate data
	// - upload attachment to get foreign key
	// - Create purchase order in database
	// - Return created purchase order with ID

	var reqpo PurchaseOrder

	err := c.BindJSON(&reqpo)

	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status: http.StatusBadRequest,
			Error:  err.Error(),
		})
		return
	}

	_, errfile := c.FormFile("file")

	if errfile != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status: http.StatusBadRequest,
			Error:  "Bad Request, No File upload",
		})
		return
	}

	if err := ValidatePOFields(reqpo.PONumber, reqpo.Status); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid po fields",
		})
		return
	}

	//Ambil id foreign key ke tabel attachment
	fk_attachmentID, err := UploadFileAttachment(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to upload attachment",
		})
		return
	}

	//assign ke body request untuk purchase order
	reqpo.AttachmentID = fk_attachmentID
	errs := CreatePurchaseOrderDB(&reqpo)

	if errs != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   errs.Error(),
			Message: "Failed inserting new record on purchaseorder table",
		})
		return
	}

	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "Created Purchase order Successfully",
	})
}

// UpdatePurchaseOrder - Update purchase order
func UpdatePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Bind JSON request body
	// - require formfile
	// - Validate data
	// - upload attachment to get foreign key
	// - Update purchase order in database with attachment foreign key
	// - Return updated purchase order
	poIDstr := c.Param("id")
	var poID uint
	var poReq PurchaseOrder
	fmt.Sscanf(poIDstr, "%d", &poID)
	err := c.BindJSON(&poReq)

	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status: http.StatusBadRequest,
			Error:  "Bad Request",
		})
		return
	}

	errs := UpdatePurchaseOrderDB(poID, &poReq)

	if errs != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   "Failed to update on DB",
			Message: "Failed update record on purchaseorder table",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Updated Purchase order Successfully",
	})
}

// DeletePurchaseOrder - Delete purchase order
func DeletePurchaseOrder(c *gin.Context) {
	// TODO: Implement logic
	// - Get ID from URL parameter
	// - Soft delete purchase order from database
	// - Delete associated attachment file
	// - Return success message
	poIDstr := c.Param("id")
	var poID int
	fmt.Sscanf(poIDstr, "%d", &poID)

	if poID < 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Bad Request",
			Message: "Type mismatch, expected uint got value under 0",
		})
		return
	}

	err := DeletePurchaseOrderDB(uint(poID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   "Failed to update on DB",
			Message: "Failed delete record on purchaseorder table",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Deleted Purchase order Successfully",
	})
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
	poIDstr := c.Param("id")
	var poID int
	fmt.Sscanf(poIDstr, "%d", &poID)

	if poID < 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Bad Request",
			Message: "Type mismatch, expected uint got value under 0",
		})
		return
	}

	var poReq PurchaseOrder
	if err := c.BindJSON(&poReq); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if err := UpdatePurchaseOrderDB(uint(poID), &poReq); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   "Failed to update on DB",
			Message: "Failed update record on purchaseorder table",
		})
		return
	}

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
	companyIDstr := c.Param("company_id")
	var companyID uint

	fmt.Sscanf(companyIDstr, "%d", &companyID)

	PurchaseOrders, err := GetPurchaseOrdersByCompanyDB(companyID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   "Database Failed to return data",
			Message: "Failed",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Success retrieving data",
		Data:    PurchaseOrders,
	})
}

// ============================================================================
// FILE UPLOAD/DOWNLOAD HANDLERS
// ============================================================================

// UploadFile - Upload file attachment
func UploadFileAttachment(c *gin.Context) (uint, error) {
	// TODO: Implement logic
	// - Get file from multipart form
	// - Validate file type and size
	// - Generate filepath with uuid as its folder file name
	// - Save file to storage
	// - Create attachment record in database
	// - Return attachment ID and file info
	file, err := c.FormFile("file")

	if err != nil {
		return 0, err
	}

	dst := filepath.Join(folderPath, file.Filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed while saving file to backend",
		})
	}

	if err := ValidateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid File type",
		})
	}

	var attachment Attachment = Attachment{
		FileName: file.Filename,
		FilePath: GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}
	CreateAttachmentDB(&attachment)

	return attachment.ID, nil

}

// UploadFile - Wrapper for uploading files
func UploadFile(c *gin.Context) {
	attachmentID, err := UploadFileAttachment(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to upload file",
		})
		return
	}
	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "File uploaded successfully",
		Data:    map[string]uint{"attachment_id": attachmentID},
	})
}

// DownloadFile - Download file attachment
func DownloadFile(c *gin.Context) {
	// TODO: Implement logic
	// - Get attachment ID from URL parameter
	// - Query attachment from database
	// - Retrieve file from storage
	// - Return file with proper headers
	// - Handle file not found error
	attachmentIDstr := c.Param("id")
	var attachmentID string
	fmt.Sscanf(attachmentIDstr, "%d", &attachmentID)

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
