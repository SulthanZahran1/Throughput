# Multi-stage build for Throughput
# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.24-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache git

# Enable automatic toolchain download
ENV GOTOOLCHAIN=auto

WORKDIR /app/backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build release binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o throughput-backend ./cmd/server

# Stage 3: Production
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates wget

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/backend/throughput-backend ./

# Copy frontend dist
COPY --from=frontend-builder /app/frontend/dist ./static

# Create non-root user
RUN adduser -D -g '' appuser
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Run the backend
CMD ["./throughput-backend"]
