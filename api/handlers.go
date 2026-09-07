package api

import "github.com/gin-gonic/gin"

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
