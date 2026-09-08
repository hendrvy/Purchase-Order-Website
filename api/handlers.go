package api

import (
	"fmt"
	"net/http"

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
	var response LoginResponse
	if err := c.BindJSON(&logReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid Data"})
	}

	var user Company

	DB.Where("username = ?", logReq.Username).First(&user)
	if user.ID == 0 {
		fmt.Println("Failed Login")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username or password is incorrect!"})
		return
	}

	if user.Password != logReq.Password {
		fmt.Println("Failed Login")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username or password is incorrect!"})
		return
	}

	response = LoginResponse{
		Token:   "Success",
		Company: Company{},
	}

	c.JSON(http.StatusOK, response)
}

func Register(c *gin.Context) {
	var registReq RegisterRequest
	if err := c.BindJSON(&registReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid Data"})
	}

	var data *Company = &registReq.Company

	if data.CompanyName != "" && data.Username != "" {
		c.JSON(http.StatusOK, gin.H{"message": "Registered successfully with \n Company Name : " + data.CompanyName +
			"Username : " + data.Username})
	}

	DB.Delete(&Company{}, 1)
	result := DB.Create(&data)
	fmt.Println(result.Error)
	fmt.Println(result.RowsAffected)

}
