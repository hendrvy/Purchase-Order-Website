package main

import (
	"Purchase-Order-Website/backend/api"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	if db := api.DBConnect(); db != nil {
		fmt.Printf("Successfully Connected to PostgreSQL Database")
	}

	router.POST("/hello", api.HelloIn)
	router.POST("/api/login", api.Login)
	router.POST("/api/register", api.Register)

	var port string = ":3455"

	fmt.Printf("Server is running on %s\n", port)

	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}
