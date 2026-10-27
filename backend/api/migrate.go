package api

import (
	"fmt"
	"log"
	"sort"
	"strings"

	dbfiles "Purchase-Order-Website/backend/db"

	"gorm.io/gorm"
)

const migrationLockID = 727001

// RunMigrations applies any pending SQL migrations (backend/db/migrations).
//
//   - Fresh database (no tables yet): schema.sql is applied, and every
//     migration is recorded as applied since schema.sql already includes them.
//   - Existing database: pending migrations are applied in filename order and
//     recorded in schema_migrations. Migrations are idempotent, so databases
//     that had them applied manually before are safe too.
//
// A Postgres advisory lock prevents concurrent containers from racing.
func RunMigrations(db *gorm.DB) error {
	entries, err := dbfiles.FS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read embedded migrations: %w", err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	return db.Connection(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_lock(?)", migrationLockID).Error; err != nil {
			return fmt.Errorf("acquire migration lock: %w", err)
		}
		defer tx.Exec("SELECT pg_advisory_unlock(?)", migrationLockID)

		if err := tx.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`).Error; err != nil {
			return fmt.Errorf("create schema_migrations: %w", err)
		}

		var applied []string
		if err := tx.Raw("SELECT filename FROM schema_migrations").Scan(&applied).Error; err != nil {
			return fmt.Errorf("read schema_migrations: %w", err)
		}
		done := make(map[string]bool, len(applied))
		for _, f := range applied {
			done[f] = true
		}

		if len(applied) == 0 {
			var hasCompanies bool
			if err := tx.Raw("SELECT to_regclass('public.companies') IS NOT NULL").Scan(&hasCompanies).Error; err != nil {
				return fmt.Errorf("check existing schema: %w", err)
			}
			if !hasCompanies {
				log.Println("[migrate] empty database, applying schema.sql")
				schema, err := dbfiles.FS.ReadFile("schema.sql")
				if err != nil {
					return fmt.Errorf("read schema.sql: %w", err)
				}
				if err := tx.Exec(string(schema)).Error; err != nil {
					return fmt.Errorf("apply schema.sql: %w", err)
				}
				for _, f := range files {
					if err := tx.Exec("INSERT INTO schema_migrations (filename) VALUES (?) ON CONFLICT DO NOTHING", f).Error; err != nil {
						return fmt.Errorf("record %s: %w", f, err)
					}
				}
				return nil
			}
		}

		for _, f := range files {
			if done[f] {
				continue
			}
			content, err := dbfiles.FS.ReadFile("migrations/" + f)
			if err != nil {
				return fmt.Errorf("read %s: %w", f, err)
			}
			log.Printf("[migrate] applying %s", f)
			if err := tx.Exec(string(content)).Error; err != nil {
				return fmt.Errorf("apply %s: %w", f, err)
			}
			if err := tx.Exec("INSERT INTO schema_migrations (filename) VALUES (?)", f).Error; err != nil {
				return fmt.Errorf("record %s: %w", f, err)
			}
		}
		return nil
	})
}
