package main

import (
	"log/slog"
	"os"
	"throughput-backend/internal/api"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize structured logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	slog.SetDefault(logger)

	r := gin.New()

	// CORS for frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: true,
	}))

	// Use custom logging middleware
	r.Use(api.LoggerMiddleware())
	r.Use(gin.Recovery())

	// Routes
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Frontend logging endpoint
	r.POST("/api/log", api.HandleFrontendLogs)

	slog.Info("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
