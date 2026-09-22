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
	protected.POST("/change-password", api.ChangePassword)

	var port string = ":3455"

	fmt.Printf("Server is running on %s\n", port)

	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}
