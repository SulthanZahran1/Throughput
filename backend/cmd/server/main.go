package main

import (
	"context"
	"embed"
	"log/slog"
	"net/http"
	"os"
	"sort"
	"strings"

	"throughput-backend/internal/api"
	"throughput-backend/internal/services"
	"throughput-backend/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func loadMigrations() ([]storage.Migration, error) {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return nil, err
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	var migrations []storage.Migration
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		sql, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return nil, err
		}
		migrations = append(migrations, storage.Migration{
			Name: entry.Name(),
			SQL:  string(sql),
		})
	}
	return migrations, nil
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	ctx := context.Background()

	// Database setup (optional — if DATABASE_URL is set)
	var metaSvc *services.MetaService
	var runSvc *services.RunService

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		db, err := storage.NewDB(ctx, dbURL)
		if err != nil {
			slog.Error("Failed to connect to database", "error", err)
			os.Exit(1)
		}
		defer db.Close()

		migrations, err := loadMigrations()
		if err != nil {
			slog.Error("Failed to load migrations", "error", err)
			os.Exit(1)
		}

		if err := db.RunMigrations(ctx, migrations); err != nil {
			slog.Error("Failed to run migrations", "error", err)
			os.Exit(1)
		}

		metaSvc = services.NewMetaService(db)
		runSvc = services.NewRunService(db)

		slog.Info("Database connected, migrations applied")
	} else {
		slog.Warn("DATABASE_URL not set — running without database")
	}

	r := gin.New()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "https://throughput.zahranm.cloud"},
		AllowMethods:     []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: true,
	}))

	r.Use(api.LoggerMiddleware())
	r.Use(gin.Recovery())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// API Routes
	r.GET("/api/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	r.POST("/api/log", api.HandleFrontendLogs)

	// Register roguelite routes (only if DB is available)
	if metaSvc != nil && runSvc != nil {
		api.RegisterRoutes(r, metaSvc, runSvc)
	}

	// Serve static frontend files
	r.Static("/assets", "./static/assets")
	r.StaticFile("/", "./static/index.html")
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	slog.Info("Starting server on :8080")
	if err := r.Run(":8080"); err != nil && err != http.ErrServerClosed {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
