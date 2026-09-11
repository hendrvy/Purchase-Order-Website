package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

// AuthMiddleware - Middleware untuk protect routes yang membutuhkan authentication
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token dari Authorization header
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, JsonResponse{
				Status:  http.StatusUnauthorized,
				Message: "Missing authorization header",
				Error:   "Authorization header required",
			})
			c.Abort()
			return
		}

		// Extract token dari "Bearer <token>" format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, JsonResponse{
				Status:  http.StatusUnauthorized,
				Message: "Invalid authorization header format",
				Error:   "Expected 'Bearer <token>' format",
			})
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, JsonResponse{
				Status:  http.StatusUnauthorized,
				Message: "Invalid or expired token",
				Error:   err.Error(),
			})
			c.Abort()
			return
		}

		// Store claims di context untuk digunakan di handler
		c.Set("claims", claims)
		c.Set("user_id", uint(claims["id"].(float64)))
		c.Set("username", claims["username"].(string))
		c.Set("company_name", claims["company"].(string))

		fmt.Printf("Auth successful for user: %s\n", claims["username"].(string))

		c.Next()
	}
}

// CORSMiddleware - Middleware untuk CORS
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
