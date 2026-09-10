package api

import (
	"time"
)

func seedData() *Company {
	company := Company{
		ID:          1,
		Username:    "ptsms",
		CompanyName: "PT Saran Maju Sejahtera",
		Password:    "sms123123",
		Email:       "ptsms@gmail.com",
		Phone:       "1234-2345-2223",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	storage.companies[company.ID] = company

	return &company
}
