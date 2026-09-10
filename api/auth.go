package api

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var SecretKey []byte = []byte(os.Getenv("SECRET_KEY"))

func GenerateToken(company Company) (string, error) {
	claims := jwt.MapClaims{
		"username": company.Username,
		"company":  company.CompanyName,
		"email":    company.Email,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString(SecretKey)

	if err != nil {
		fmt.Println("error while Creating Token")
		return "", err
	}

	return tokenString, nil

}

func ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		return SecretKey, nil
	})

	if err != nil {
		return nil, err
	}

	claims := token.Claims.(jwt.MapClaims)
	return claims, err

}
