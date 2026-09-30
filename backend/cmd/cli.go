package main

import (
	"Purchase-Order-Website/backend/api"
	"fmt"
	"os"
	"strings"
)

// HandleCLI processes CLI commands
func HandleCLI() bool {
	if len(os.Args) <= 1 {
		return false // Run server mode
	}

	switch os.Args[1] {
	case "db":
		handleDB()
		os.Exit(0)
	case "help":
		showHelp()
		os.Exit(0)
	}

	return false
}

func handleDB() {
	if len(os.Args) < 3 {
		showDBHelp()
		return
	}

	if db := api.DBConnect(); db == nil {
		fmt.Println("Failed to connect to database")
		return
	}

	switch os.Args[2] {
	case "create-user":
		createUserCLI()
	case "migrate":
		fmt.Println("Running migrations...")
		// Add migration logic here
	case "seed":
		fmt.Println("Seeding database...")
		// Add seed logic here
	default:
		fmt.Printf("Unknown command: %s\n", os.Args[2])
		showDBHelp()
	}
}

func createUserCLI() {
	fmt.Println("")
	fmt.Println("==============")
	fmt.Println("Create User")
	fmt.Println("==============")

	var username, email, password, companyName, role string

	// Get username
	for {
		fmt.Print("Username: ")
		fmt.Scanln(&username)
		username = strings.TrimSpace(username)
		if username == "" {
			fmt.Println("Username cannot be empty")
			continue
		}
		if api.CheckUsernameExists(username, 0) {
			fmt.Println("Username already exists")
			continue
		}
		break
	}

	// Get email
	for {
		fmt.Print("Email: ")
		fmt.Scanln(&email)
		email = strings.TrimSpace(email)
		if email == "" {
			fmt.Println("Email cannot be empty")
			continue
		}
		if !strings.Contains(email, "@") {
			fmt.Println("Invalid email format")
			continue
		}
		if api.CheckEmailExists(email, 0) {
			fmt.Println("Email already exists")
			continue
		}
		break
	}

	// Get password
	for {
		fmt.Print("Password (min 6 chars): ")
		fmt.Scanln(&password)
		if len(password) < 6 {
			fmt.Println("Password must be at least 6 characters")
			continue
		}
		break
	}

	// Get company name
	fmt.Print("Company Name: ")
	fmt.Scanln(&companyName)
	companyName = strings.TrimSpace(companyName)
	if companyName == "" {
		companyName = username
	}

	// Get role
	for {
		fmt.Print("Role (user/validator/admin) [default: user]: ")
		fmt.Scanln(&role)
		role = strings.TrimSpace(role)
		if role == "" {
			role = "user"
		}
		if !api.IsValidRole(role) {
			fmt.Println("Invalid role. Choose: user, validator, or admin")
			continue
		}
		break
	}

	// Hash password
	hashedPassword, err := api.HashPassword(password)
	if err != nil {
		fmt.Printf("Error: Failed to hash password - %v\n", err)
		return
	}

	// Create company
	company := api.Company{
		Username:    username,
		Email:       email,
		Password:    hashedPassword,
		CompanyName: companyName,
		Role:        api.Roles(role),
	}

	if result := api.DB.Create(&company); result.Error != nil {
		fmt.Printf("Error: Failed to create user - %v\n", result.Error)
		return
	}

	fmt.Println("")
	fmt.Println("User created successfully!")
	fmt.Printf("  ID: %d\n", company.ID)
	fmt.Printf("  Username: %s\n", company.Username)
	fmt.Printf("  Email: %s\n", company.Email)
	fmt.Printf("  Company: %s\n", company.CompanyName)
	fmt.Printf("  Role: %s\n", company.Role)
	fmt.Println("")
}

func showHelp() {
	fmt.Println("Purchase Order Website - API Server")
	fmt.Println("\nUsage: ./server [command] [options]")
	fmt.Println("\nCommands:")
	fmt.Println("  db <command>   - Database operations (create-user, migrate, seed)")
	fmt.Println("  help           - Show this help message")
	fmt.Println("\nWithout commands, the API server will start on :3455")
}

func showDBHelp() {
	fmt.Println("==============")
	fmt.Println("Database Commands")
	fmt.Println("==============")
	fmt.Println("Usage: ./server db <command>")
	fmt.Println("\nAvailable commands:")
	fmt.Println("  create-user    - Create a new user")
	fmt.Println("  migrate        - Run database migrations")
	fmt.Println("  seed           - Seed the database")
}
