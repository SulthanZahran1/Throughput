package api

import (
	"net/http"

	"throughput-backend/internal/models"
	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type RunHandler struct {
	svc *services.RunService
}

func NewRunHandler(svc *services.RunService) *RunHandler {
	return &RunHandler{svc: svc}
}

// SubmitRun handles POST /api/runs
func (h *RunHandler) SubmitRun(c *gin.Context) {
	var submission models.RunSubmission
	if err := c.ShouldBindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if submission.DeviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId is required"})
		return
	}

	run, err := h.svc.SubmitRun(c.Request.Context(), &submission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"run":     run,
	})
}
