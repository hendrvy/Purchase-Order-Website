package api

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// passwordResetTokenTTL - How long a reset link stays valid after being
// requested. Matches the "berlaku selama 1 jam" wording in the email
// (email.go SendPasswordResetEmail).
const passwordResetTokenTTL = 1 * time.Hour

// hashResetToken - SHA-256 hex digest of the raw token. We store only
// this hash in the database (PasswordReset.TokenHash) - never the raw
// token - the same reasoning as storing bcrypt hashes for real passwords,
// except SHA-256 (not bcrypt) is used here since this is a lookup key for
// a random 122-bit UUID (already high entropy, not a user-chosen
// password), and needs to be fast to look up in a WHERE clause.
func hashResetToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

// ForgotPassword - Public (unauthenticated) endpoint: a locked-out user
// submits their registered email, and if it matches an account, we email
// them a one-time reset link. Always returns the same generic success
// message regardless of whether the email was found, to avoid leaking
// which emails are registered (email enumeration).
func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if req.Email == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Email is required",
			Error:   "Missing required field",
		})
		return
	}

	const genericMessage = "Jika email terdaftar, kami telah mengirimkan link reset password."

	company, err := GetCompanyByEmailDB(req.Email)
	if err != nil {
		// Deliberately the same response as the success path below - see
		// the email-enumeration note in the handler comment.
		fmt.Println("Forgot password: email not found - " + req.Email)
		c.JSON(http.StatusOK, JsonResponse{
			Status:  http.StatusOK,
			Message: genericMessage,
		})
		return
	}

	// A super_admin's password can never be reset except by themselves via
	// the normal "current password" flow (ChangePassword) - see
	// RoleSuperAdmin in models.go and AdminResetCompanyPassword in
	// admin_handlers.go for the same rule enforced on the admin-initiated
	// reset path. Silently no-op here too (same generic response) rather
	// than revealing the account is a super_admin.
	if company.Role == RoleSuperAdmin {
		fmt.Println("Forgot password: refused for super_admin - " + company.Username)
		c.JSON(http.StatusOK, JsonResponse{
			Status:  http.StatusOK,
			Message: genericMessage,
		})
		return
	}

	// Invalidate any previously requested, still-valid reset links for
	// this account before issuing a new one - only the most recent email
	// should work.
	if err := InvalidateExistingPasswordResetsDB(company.ID); err != nil {
		fmt.Println("Forgot password: failed to invalidate old tokens - " + err.Error())
	}

	rawToken := uuid.New().String()
	reset := PasswordReset{
		UserID:    company.ID,
		TokenHash: hashResetToken(rawToken),
		ExpiresAt: time.Now().Add(passwordResetTokenTTL),
		IPAddress: c.ClientIP(),
	}

	if err := CreatePasswordResetDB(&reset); err != nil {
		fmt.Println("Forgot password: failed to store reset token - " + err.Error())
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to process request",
			Error:   "Internal error",
		})
		return
	}

	if err := SendPasswordResetEmail(company.Email, company.Username, rawToken); err != nil {
		// The token now exists in the DB but the email failed to send -
		// still return the generic success message (don't leak SMTP
		// failures to the client), but log server-side so it's visible in
		// ops/monitoring.
		fmt.Println("Forgot password: failed to send email - " + err.Error())
	}

	fmt.Printf("Forgot password: reset link issued for %s (ID: %d)\n", company.Username, company.ID)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: genericMessage,
	})
}

// ResetPassword - Public (unauthenticated) endpoint: completes the
// forgot-password flow. Takes the raw token from the emailed link plus a
// new password, and if the token is valid (exists, unused, unexpired),
// sets it as the account's new password and marks the token used.
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Token and new password are required",
			Error:   "Missing required fields",
		})
		return
	}

	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid password",
			Error:   "new_password must be at least 6 characters",
		})
		return
	}

	reset, err := GetValidPasswordResetByTokenHashDB(hashResetToken(req.Token))
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Link reset password tidak valid atau sudah kedaluwarsa",
			Error:   "Invalid or expired token",
		})
		return
	}

	company, err := GetCompanyByIDDB(reset.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Message: "Account not found",
			Error:   "Company not found",
		})
		return
	}

	// Defense in depth: even though ForgotPassword already refuses to
	// issue a token for a super_admin, guard here too in case a token was
	// issued before an account got promoted to super_admin.
	if company.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Cannot reset password of this account",
			Error:   "This account's password can only be changed by the account owner",
		})
		return
	}

	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to reset password",
			Error:   "Failed to process new password",
		})
		return
	}

	if err := UpdateCompanyPasswordDB(company.ID, hashedPassword); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to reset password",
			Error:   err.Error(),
		})
		return
	}

	if err := MarkPasswordResetUsedDB(reset.ID); err != nil {
		fmt.Println("Reset password: failed to mark token used - " + err.Error())
	}

	passwordLog := PasswordChange{
		UserID:    company.ID,
		IPAddress: c.ClientIP(),
	}
	CreatePasswordChangeLog(&passwordLog)

	fmt.Printf("Reset password: success for %s (ID: %d)\n", company.Username, company.ID)

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Password berhasil direset. Silakan login dengan password baru Anda.",
	})
}
