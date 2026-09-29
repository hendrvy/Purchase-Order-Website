# Purchase Order Website - Monorepo

Website untuk Purchase Order PT SMS dengan arsitektur monorepo.

## 📁 Struktur Folder

### `/backend`
Go backend server dengan Gin framework dan PostgreSQL.
- `cmd/` - Entry point aplikasi
- `api/` - Business logic dan handlers
- `db/` - Database migrations dan schema
- `docker/` - Docker configuration

**Setup Backend:**
```bash
cd backend
cp .env.example .env   # sesuaikan DB_HOST/DB_USER/dll dengan Postgres lokal Anda
go mod download
go run cmd/main.go
```

Server berjalan di `http://localhost:3455`. Pastikan skema database sudah dibuat terlebih dahulu (lihat `backend/db/schema.sql`) dan berjalan di Postgres yang di-point oleh `.env` Anda.

### `/frontend`
React (Vite) frontend application.

**Setup Frontend:**
```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL harus mengarah ke backend (default http://localhost:3455)
npm install
npm run dev
```

## Quick Start

### Backend
```bash
cd backend
go mod download
go run cmd/main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker Compose
```bash
cp .env.example .env   # di root project
docker-compose up
```

## Environment Variables
- `backend/.env.example` — dipakai saat menjalankan backend langsung via `go run` (bukan docker).
- `.env.example` (root) — dipakai oleh `docker-compose up`.
- `frontend/.env.example` — dipakai oleh Vite dev server (`VITE_API_BASE_URL`, `VITE_USE_MOCKS`).

Copy masing-masing ke `.env` (tanpa `.example`) dan sesuaikan nilainya sebelum menjalankan.

## Membuat Test Account (Development)

Backend belum memiliki data awal (tidak ada seed script). Untuk membuat akun uji coba, panggil endpoint register setelah backend berjalan:

```bash
curl -X POST http://localhost:3455/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "username": "testuser",
      "password": "password123",
      "company_name": "PT Test Company",
      "email": "test@example.com",
      "phone": "+6281234567890"
    }
  }'
```

`POST /api/register` selalu membuat akun dengan role `user`, apapun yang dikirim di field `role` akan diabaikan (lihat `Register` di `backend/api/auth_handlers.go`) — ini untuk mencegah siapapun mendaftarkan diri langsung sebagai admin. Setelah register, login via `POST /api/login` dengan `username`+`password` yang sama untuk mendapatkan JWT token.

### Membuat Akun Admin Pertama

Akun `validator`/`admin` hanya bisa dibuat oleh admin yang sudah ada, lewat `POST /api/companies` (lihat `AdminCreateCompany`). Karena butuh admin yang sudah ada, admin *pertama* harus dinaikkan manual lewat database setelah register biasa:

```sql
UPDATE companies SET role = 'admin' WHERE username = 'testuser';
```

### Role `super_admin`

`super_admin` adalah role admin yang statusnya terkunci: hak aksesnya sama seperti `admin`, tapi role dan passwordnya **tidak bisa diubah oleh siapapun** lewat aplikasi (termasuk oleh dirinya sendiri untuk role, atau oleh admin lain untuk password). Role ini **tidak pernah bisa dibuat/diberikan lewat UI atau API** — satu-satunya cara adalah UPDATE manual ke database:

```sql
UPDATE companies SET role = 'super_admin' WHERE username = 'hendry';
```

Jika database sudah dibuat sebelum `super_admin` ditambahkan ke enum `roles`, jalankan dulu migrasi berikut sebelum query di atas:

```bash
psql "$DATABASE_URL" -f backend/db/migrations/001_add_super_admin_role.sql
```

Koleksi Postman lengkap tersedia di `Purchase Order Management API.postman_collection.json` (base URL sudah di-set ke `http://localhost:3455`).

## Development

- Backend: Go 1.26.0 + Gin Framework + GORM + PostgreSQL
- Frontend: React 19 + Vite + TanStack Query + Tailwind CSS
- Container: Docker & Docker Compose
