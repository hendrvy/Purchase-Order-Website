package db

import "embed"

// FS holds schema.sql and every migration so the API binary can bootstrap
// and migrate the database on startup without needing the files on disk.
//
//go:embed schema.sql migrations/*.sql
var FS embed.FS
