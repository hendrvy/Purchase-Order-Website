# Stage 1: Builder
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Cache dependencies layer terpisah dari source code
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source
COPY backend/api/ ./api/
COPY backend/cmd/ ./cmd/

# Build binary, CGO disabled agar binary static (cocok untuk alpine)
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/main.go

# Stage 2: Runner
FROM alpine:latest

WORKDIR /app

# Copy hanya binary dari builder
COPY --from=builder /app/server .

EXPOSE 3455

CMD ["./server"]