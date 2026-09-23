package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// HelloIn - Simple hello endpoint for testing
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

// Login - Authenticate user and return JWT token
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
			Phone:       user.Phone,
			PhotoPath:   user.PhotoPath,
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

// AuthenticateToken - Validate JWT token
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

// Register - Register a new company/user
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
