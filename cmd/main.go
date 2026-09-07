package main

import (
	"Purchase-Order-Website/api"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	router.POST("/hello", api.HelloIn)
	router.POST("/api/register", api.InsertCompany)

	var port string = ":3455"

	fmt.Printf("Server is running on %s\n", port)

	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}
