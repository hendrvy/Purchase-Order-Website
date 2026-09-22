package api

import (
	"fmt"
	"os"
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

// queryInt - Utility function to parse query parameters as integers
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
