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
go mod download
go run cmd/main.go
```

### `/frontend`
React frontend application (will be developed).

## 🚀 Quick Start

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
npm start
```

### Docker Compose
```bash
docker-compose up
```

## 📋 Environment Variables
Copy `.env` file dari root atau backend folder sesuai kebutuhan.

## 🔧 Development

- Backend: Go 1.26.0 + Gin Framework
- Database: PostgreSQL
- Frontend: React (setup in progress)
- Container: Docker & Docker Compose
