package main

import (
	"Purchase-Order-Website/backend/api"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	// Setup middleware
	router.Use(api.CORSMiddleware())

	if db := api.DBConnect(); db != nil {
		fmt.Printf("Successfully Connected to PostgreSQL Database\n")
	}

	// ========================================================================
	// Public Routes (No Authentication Required)
	// ========================================================================
	router.POST("/hello", api.HelloIn)
	router.POST("/api/login", api.Login)
	router.POST("/api/register", api.Register)
	router.POST("/api/validate", api.AuthenticateToken)

	// ========================================================================
	// Protected Routes (Authentication Required)
	// ========================================================================
	protected := router.Group("/api")
	protected.Use(api.AuthMiddleware())

	// ========================================================================
	// Purchase Order Routes
	// ========================================================================
	protected.GET("/purchase-orders", api.GetPurchaseOrders)
	protected.GET("/purchase-orders/:id", api.GetPurchaseOrderByID)
	protected.POST("/purchase-orders", api.CreatePurchaseOrder)
	protected.PUT("/purchase-orders/:id", api.UpdatePurchaseOrder)
	protected.DELETE("/purchase-orders/:id", api.DeletePurchaseOrder)

	// ========================================================================
	// Purchase Order Status Routes
	// ========================================================================
	protected.PUT("/purchase-orders/:id/status", api.UpdatePurchaseOrderStatus)
	protected.GET("/purchase-orders/company/:company_id", api.GetPurchaseOrdersByCompany)

	// ========================================================================
	// File Upload/Download Routes
	// ========================================================================
	protected.POST("/upload", api.UploadFile)
	protected.GET("/download/:id", api.DownloadFile)

	// ========================================================================
	// Company Routes
	// ========================================================================
	protected.GET("/companies/:id", api.GetCompanyByID)
	protected.PUT("/companies/:id", api.UpdateCompanyProfile)
	protected.POST("/companies/:id/photo", api.UploadCompanyPhoto)
	protected.DELETE("/companies/:id/photo", api.DeleteCompanyPhoto)
	protected.GET("/companies/:id/photo", api.GetCompanyPhoto)
	protected.POST("/change-password", api.ChangePassword)

	// ========================================================================
	// Admin-Only Routes (User Management & Activity Log)
	// ========================================================================
	admin := protected.Group("")
	admin.Use(api.RequireAdmin())

	admin.GET("/companies", api.AdminListCompanies)
	admin.POST("/companies", api.AdminCreateCompany)
	admin.PUT("/companies/:id/role", api.AdminUpdateCompanyRole)
	admin.POST("/companies/:id/reset-password", api.AdminResetCompanyPassword)

	admin.GET("/audit/profile-changes", api.AdminGetProfileChangeLogs)
	admin.GET("/audit/password-changes", api.AdminGetPasswordChangeLogs)
	admin.GET("/audit/downloads", api.AdminGetDownloadLogs)

	var port string = ":3455"

	fmt.Printf("Server is running on %s\n", port)

	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}
