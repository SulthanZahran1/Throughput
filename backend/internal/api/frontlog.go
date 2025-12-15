package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// LogEntry represents a log entry from the frontend
type LogEntry struct {
	Level     string                 `json:"level"`
	Source    string                 `json:"source"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Timestamp string                 `json:"timestamp"`
}

// LogBatch represents a batch of log entries
type LogBatch struct {
	Logs []LogEntry `json:"logs"`
}

// HandleFrontendLogs receives and logs frontend events
func HandleFrontendLogs(c *gin.Context) {
	var batch LogBatch
	if err := c.ShouldBindJSON(&batch); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, entry := range batch.Logs {
		// Parse timestamp
		ts, err := time.Parse(time.RFC3339, entry.Timestamp)
		if err != nil {
			ts = time.Now()
		}

		// Convert data to JSON for logging
		dataJSON := ""
		if entry.Data != nil {
			if bytes, err := json.Marshal(entry.Data); err == nil {
				dataJSON = string(bytes)
			}
		}

		// Log with appropriate level
		switch entry.Level {
		case "error":
			slog.Error("[FE] "+entry.Message,
				"source", entry.Source,
				"data", dataJSON,
				"client_ts", ts.Format("15:04:05.000"),
			)
		case "warn":
			slog.Warn("[FE] "+entry.Message,
				"source", entry.Source,
				"data", dataJSON,
				"client_ts", ts.Format("15:04:05.000"),
			)
		case "info":
			slog.Info("[FE] "+entry.Message,
				"source", entry.Source,
				"data", dataJSON,
				"client_ts", ts.Format("15:04:05.000"),
			)
		default:
			slog.Debug("[FE] "+entry.Message,
				"source", entry.Source,
				"data", dataJSON,
				"client_ts", ts.Format("15:04:05.000"),
			)
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": len(batch.Logs)})
}
