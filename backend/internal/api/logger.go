package api

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log after request
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		if raw != "" {
			path = path + "?" + raw
		}

		logger := slog.With(
			"status", statusCode,
			"method", method,
			"path", path,
			"latency", latency,
			"ip", clientIP,
			"user-agent", c.Request.UserAgent(),
		)

		if errorMessage != "" {
			logger.Error("Request failed", "error", errorMessage)
		} else {
			logger.Info("Request processed")
		}
	}
}
