package api

import (
	"fmt"
	"net/smtp"
	"os"

	"github.com/joho/godotenv"
)

// ============================================================================
// SMTP CONFIGURATION (password reset emails)
// ============================================================================

// smtpConfig - Loaded from env vars (see .env.example). Uses the stdlib
// net/smtp package - same minimal-dependency approach as the rest of the
// backend (no third-party mail library needed for a plain-text email over
// SMTP+STARTTLS, which is all Gmail/most providers require).
type smtpConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

// loadSMTPConfig - Mirrors auth.go's LoadSecretKey() pattern: calls
// godotenv.Load() defensively (harmless no-op if already loaded/no .env
// file present, e.g. in production where env vars are injected directly)
// then reads from the environment.
func loadSMTPConfig() smtpConfig {
	godotenv.Load()

	return smtpConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		User:     os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
	}
}

// loadFrontendURL - Base URL of the frontend app, used to build the
// clickable reset-password link embedded in the email. Falls back to the
// Vite dev server default so local development works out of the box even
// if FRONTEND_URL isn't set in backend/.env.
func loadFrontendURL() string {
	godotenv.Load()

	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		url = "http://localhost:5173"
	}
	return url
}

// SendPasswordResetEmail - Emails a password reset link (containing the
// raw, unhashed token - see ForgotPassword in forgot_password_handlers.go)
// to the user's registered address via SMTP+STARTTLS (smtp.SendMail
// upgrades a plain connection to TLS automatically when the server
// advertises STARTTLS, which is how Gmail/most providers operate on port
// 587).
func SendPasswordResetEmail(toEmail string, toUsername string, rawToken string) error {
	cfg := loadSMTPConfig()

	if cfg.Host == "" || cfg.User == "" || cfg.Password == "" {
		return fmt.Errorf("SMTP is not configured - set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD")
	}

	from := cfg.From
	if from == "" {
		from = cfg.User
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", loadFrontendURL(), rawToken)

	subject := "Reset Password - SMS Order"
	body := fmt.Sprintf(
		"Halo %s,\r\n\r\n"+
			"Kami menerima permintaan untuk mereset password akun Anda.\r\n"+
			"Klik link berikut untuk membuat password baru (berlaku selama 1 jam):\r\n\r\n"+
			"%s\r\n\r\n"+
			"Jika Anda tidak meminta reset password, abaikan email ini - password Anda tidak akan berubah.\r\n\r\n"+
			"Salam,\r\nTim SMS Order",
		toUsername, resetLink,
	)

	// Manually build RFC 5322 headers - net/smtp.SendMail sends the raw
	// message body verbatim, it doesn't set headers for you.
	message := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, toEmail, subject, body,
	)

	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)

	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, []byte(message)); err != nil {
		return fmt.Errorf("failed to send reset email: %w", err)
	}

	return nil
}
