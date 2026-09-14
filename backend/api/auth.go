package api

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var SecretKey []byte = []byte(os.Getenv("SECRET_KEY"))

// ============================================================================
// PASSWORD HASHING & VERIFICATION
// ============================================================================

// HashPassword - Hash password menggunakan bcrypt
func HashPassword(password string) (string, error) {
	// Cost factor 10 - balance antara security dan performance
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword - Verify password dengan hash yang tersimpan
func VerifyPassword(hashedPassword, plainPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}

// ============================================================================
// JWT TOKEN GENERATION & VALIDATION
// ============================================================================

// GenerateToken - Generate JWT token untuk company
func GenerateToken(company Company) (string, error) {
	if len(SecretKey) == 0 {
		return "", errors.New("SECRET_KEY environment variable not set")
	}

	claims := jwt.MapClaims{
		"id":       company.ID,
		"username": company.Username,
		"company":  company.CompanyName,
		"email":    company.Email,
		"iat":      time.Now().Unix(),
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString(SecretKey)

	if err != nil {
		fmt.Println("error while creating token: " + err.Error())
		return "", err
	}

	return tokenString, nil
}

// ValidateToken - Validate dan parse JWT token
func ValidateToken(tokenString string) (jwt.MapClaims, error) {
	if len(SecretKey) == 0 {
		return nil, errors.New("SECRET_KEY environment variable not set")
	}

	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return SecretKey, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
