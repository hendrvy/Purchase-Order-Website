package main

import (
	"Purchase-Order-Website/api"
	"fmt"
)

func main() {
	var storage *api.Storage
	storage = api.GetStorage()
	fmt.Println(storage.companies[0])
}
