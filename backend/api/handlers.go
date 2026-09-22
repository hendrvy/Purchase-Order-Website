package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var folderPath = "/app/uploads"

func init() {
	// Load environment variables from .env file
	godotenv.Load()

	// Set default upload folder path from env or use default
	folderPath = os.Getenv("UPLOAD_FOLDER_PATH")
	if folderPath == "" {
		folderPath = "/app/uploads"
	}
}

func DBConnect() *gorm.DB {
	// Load environment variables from .env file
	godotenv.Load()

	// Get database configuration from environment variables
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		panic("DB_HOST environment variable is required")
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		panic("DB_USER environment variable is required")
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		panic("DB_PASSWORD environment variable is required")
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		panic("DB_NAME environment variable is required")
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbSSLMode := os.Getenv("DB_SSLMODE")
	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	// Build DSN from environment variables
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		dbHost, dbUser, dbPassword, dbName, dbPort, dbSSLMode)

	// Retry logic for database connection
	var db *gorm.DB
	var err error
	maxRetries := 10
	retryDelay := 2 * time.Second

	for i := 0; i < maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		fmt.Printf("Database connection attempt %d/%d failed: %v\n", i+1, maxRetries, err)
		if i < maxRetries-1 {
			time.Sleep(retryDelay)
		}
	}

	if err != nil {
		panic(fmt.Sprintf("failed to connect to database after %d retries: %v", maxRetries, err))
	}

	DB = db
	return db
}

func HelloIn(c *gin.Context) {
	var helloReq HelloRequest
	if err := c.BindJSON(&helloReq); err != nil {
		c.JSON(400, gin.H{"error": "False input field"})
		return
	}

	if helloReq.Message != "" {
		c.JSON(200, HelloRequest{
			Message: "Hello from server! You said : " + helloReq.Message,
		})
		return
	}

	c.JSON(400, gin.H{"error": "Message field is required"})
}

func InsertCompany(c *gin.Context) {
	var companyReq CompanyRequest
	if err := c.BindJSON(&companyReq); err != nil {
		c.JSON(400, gin.H{"error": "not a Company data request"})
		return
	}

	if companyReq.Company.CompanyName != "" {
		c.JSON(200, gin.H{"message": "Company data acquired \n" + companyReq.Company.CompanyName})
		return
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

	// Extract claims with error handling
	username, ok := data["username"].(string)
	if !ok {
		fmt.Println("Token validation failed: username claim not found or invalid type")
		c.JSON(http.StatusUnauthorized, JsonResponse{
			Status:  http.StatusUnauthorized,
			Message: "Invalid token claims",
			Error:   "username claim is missing or invalid",
		})
		return
	}

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
	_, err := fmt.Sscanf(val, "%d", &result)
	if err != nil || result < 1 {
		return defaultVal
	}
	if key == "limit" && result > 100 {
		return 100
	}
	return result
}

// ============================================================================
// PURCHASE ORDER HANDLERS
// ============================================================================

// GetPurchaseOrders - Get all purchase orders
func GetPurchaseOrders(c *gin.Context) {
	userRole := c.GetString("role")

	if userRole == "user" {
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
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	purchaseOrder, err := GetPurchaseOrderByIDDB(uint(poID))

	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Message: "Purchase order not found",
			Error:   err.Error(),
		})
		return
	}

	if userRole == "user" && purchaseOrder.CompanyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Access denied",
			Error:   "You do not have permission to access this purchase order",
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
	// - Parse payload from multipart form
	// - Unmarshal JSON from payload
	// - Validate required fields
	// - require formfile
	// - upload attachment to get foreign key
	// - Create purchase order in database
	// - Return created purchase order with ID

	// Extract payload from multipart form
	payloadStr := c.PostForm("payload")
	if payloadStr == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Missing payload field",
			Message: "Failed to parse purchase order data",
		})
		return
	}

	// Unmarshal JSON payload into PurchaseOrder struct
	var reqpo PurchaseOrder
	err := json.Unmarshal([]byte(payloadStr), &reqpo)
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid JSON in payload: " + err.Error(),
			Message: "Failed to parse purchase order data",
		})
		return
	}

	// Check for file in multipart form
	_, errfile := c.FormFile("file")
	if errfile != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Bad Request, No File upload",
			Message: "File is required",
		})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Failed to parse multipart form",
		})
		return
	}

	files := form.File["file"]
	if len(files) > 1 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Only one file allowed per purchase order",
			Message: "Multiple files not supported",
		})
		return
	}

	// Validate required fields
	if err := ValidatePOFields(reqpo.PONumber, reqpo.Status); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid po fields",
		})
		return
	}

	if reqpo.CompanyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "company_id is required and must be greater than 0",
			Message: "Invalid po fields",
		})
		return
	}

	if !ValidateCompanyExists(reqpo.CompanyID) {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Company not found",
			Message: "Invalid company_id",
		})
		return
	}

	fk_attachmentID, filePath, err := UploadFileAttachmentWithPath(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to upload attachment",
		})
		return
	}

	reqpo.AttachmentID = fk_attachmentID
	errs := CreatePurchaseOrderDB(&reqpo)

	if errs != nil {
		os.Remove(filePath)
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
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to update this purchase order",
		})
		return
	}

	err = c.BindJSON(&poReq)

	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid request format",
		})
		return
	}

	if err := ValidatePOFields(poReq.PONumber, poReq.Status); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid po fields",
		})
		return
	}

	errs := UpdatePurchaseOrderDB(poID, &poReq)

	if errs != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
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
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to delete this purchase order",
		})
		return
	}

	err = DeletePurchaseOrderDB(poID)

	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
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
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userRole := c.GetString("role")

	if userRole == "user" {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "Only validators and admins can update PO status",
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

	if poReq.Status == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   "Status field is required",
		})
		return
	}

	if err := UpdatePurchaseOrderDB(poID, &poReq); err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Purchase order status updated successfully",
		Data: map[string]interface{}{
			"id": poID,
		},
	})
}

// GetPurchaseOrdersByCompany - Get all purchase orders for a company
func GetPurchaseOrdersByCompany(c *gin.Context) {
	userID := c.GetUint("user_id")
	userRole := c.GetString("role")
	companyIDstr := c.Param("company_id")
	var companyID uint

	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)
	if err != nil || companyID == 0 {
		companyID = userID
	}

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only view your own purchase orders",
		})
		return
	}

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

	// Validate file BEFORE saving to disk
	if err := ValidateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid File type",
		})
		return 0, err
	}

	var attachment Attachment = Attachment{
		FileName: file.Filename,
		FilePath: GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}

	dst := filepath.Join(folderPath, attachment.FilePath)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed while saving file to backend",
		})
		return 0, err
	}

	fmt.Println(GenerateUniqueFilename(file.Filename))

	if err := CreateAttachmentDB(&attachment); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to create attachment record",
		})
		return 0, err
	}

	return attachment.ID, nil

}

// UploadFileAttachmentWithPath - Upload file and return attachment ID with file path
func UploadFileAttachmentWithPath(c *gin.Context) (uint, string, error) {
	file, err := c.FormFile("file")

	if err != nil {
		return 0, "", err
	}

	if err := ValidateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid File type",
		})
		return 0, "", err
	}

	var attachment Attachment = Attachment{
		FileName: file.Filename,
		FilePath: GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}

	dst := filepath.Join(folderPath, attachment.FilePath)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed while saving file to backend",
		})
		return 0, "", err
	}

	if err := CreateAttachmentDB(&attachment); err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to create attachment record",
		})
		return 0, "", err
	}

	return attachment.ID, dst, nil

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

// UploadMultipleAttachments - Upload multiple file attachments (max 10 files, 5MB each)
func UploadMultipleAttachments(c *gin.Context) {
	const MaxFiles = 10
	const MaxFileSize = 5 * 1024 * 1024 // 5MB in bytes

	// Parse multipart form with size limit
	err := c.Request.ParseMultipartForm(MaxFileSize * MaxFiles)
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Failed to parse multipart form",
			Message: "Form size exceeds maximum limit",
		})
		return
	}

	form := c.Request.MultipartForm
	if form == nil || form.File == nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "No files uploaded",
			Message: "At least one file is required",
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "No files found with key 'files'",
			Message: "File field is required",
		})
		return
	}

	// Validate number of files
	if len(files) > MaxFiles {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   fmt.Sprintf("Too many files. Maximum %d files allowed", MaxFiles),
			Message: "File limit exceeded",
		})
		return
	}

	// Process each file
	var uploadedAttachments []map[string]interface{}
	var uploadedFilePaths []string
	var failedFiles []map[string]string

	for idx, file := range files {
		// Validate file size
		if file.Size > MaxFileSize {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    fmt.Sprintf("File size exceeds 5MB limit (%.2f MB)", float64(file.Size)/(1024*1024)),
			})
			continue
		}

		// Validate file type
		if err := ValidateFile(file); err != nil {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    err.Error(),
			})
			continue
		}

		// Create attachment record
		attachment := Attachment{
			FileName: file.Filename,
			FilePath: GenerateUniqueFilename(file.Filename),
			MimeType: GetMimeType(file.Filename),
		}

		// Save file to storage
		dst := filepath.Join(folderPath, attachment.FilePath)
		if err := c.SaveUploadedFile(file, dst); err != nil {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    "Failed to save file to storage",
			})
			continue
		}

		// Create attachment record in database
		if err := CreateAttachmentDB(&attachment); err != nil {
			// Cleanup file if database operation fails
			os.Remove(dst)
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    "Failed to create attachment record",
			})
			continue
		}

		// Track successful upload
		uploadedFilePaths = append(uploadedFilePaths, dst)
		uploadedAttachments = append(uploadedAttachments, map[string]interface{}{
			"index":          idx,
			"attachment_id":  attachment.ID,
			"filename":       attachment.FileName,
			"original_name":  file.Filename,
			"file_path":      attachment.FilePath,
			"mime_type":      attachment.MimeType,
			"size_bytes":     file.Size,
			"size_mb":        fmt.Sprintf("%.2f", float64(file.Size)/(1024*1024)),
		})
	}

	// Determine response status
	responseStatus := http.StatusCreated
	var message string
	
	if len(uploadedAttachments) == 0 {
		responseStatus = http.StatusBadRequest
		message = "No files were uploaded successfully"
	} else if len(failedFiles) > 0 {
		responseStatus = http.StatusMultiStatus
		message = fmt.Sprintf("Partially uploaded: %d/%d files uploaded successfully", len(uploadedAttachments), len(files))
	} else {
		message = fmt.Sprintf("Successfully uploaded %d file(s)", len(uploadedAttachments))
	}

	responseData := map[string]interface{}{
		"total_files":          len(files),
		"successful":           len(uploadedAttachments),
		"failed":               len(failedFiles),
		"uploaded_attachments": uploadedAttachments,
	}

	if len(failedFiles) > 0 {
		responseData["failed_files"] = failedFiles
	}

	c.JSON(responseStatus, JsonResponse{
		Status:  responseStatus,
		Message: message,
		Data:    responseData,
	})
}

// DownloadFile - Download file attachment
func DownloadFile(c *gin.Context) {
	attachmentIDstr := c.Param("id")
	var attachmentID uint
	_, err := fmt.Sscanf(attachmentIDstr, "%d", &attachmentID)

	if err != nil || attachmentID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid attachment ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	attachment, err := GetAttachmentByID(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "File not found",
			Message: "Attachment does not exist",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	// Get the purchase order ID associated with this attachment
	poID, err := GetPOIDFromAttachment(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "This file is not associated with any purchase order",
		})
		return
	}

	// Get the owner (company) of the file
	ownerID, err := GetFileOwner(attachmentID)
	if err != nil {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to download this file",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only download your own company's files",
		})
		return
	}

	ipAddress := c.ClientIP()

	filePath := filepath.Join(folderPath, attachment.FilePath)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "File not found on disk",
			Message: "The file has been deleted",
		})
		return
	}

	downloadLog := DownloadLog{
		UserID:       userID,
		AttachmentID: attachmentID,
		POID:         poID,
		IPAddress:    ipAddress,
	}
	CreateDownloadLog(&downloadLog)

	disposition := "attachment"
	if strings.Contains(attachment.MimeType, "image") || strings.Contains(attachment.MimeType, "text") {
		disposition = "inline"
	}

	c.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, attachment.FileName))
	c.Header("Content-Type", attachment.MimeType)
	c.File(filePath)
}

// ============================================================================
// COMPANY HANDLERS
// ============================================================================

// GetCompanyByID - Get company details
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

// UpdateCompanyProfile - Update company profile
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

// ChangePassword - Change company password
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
