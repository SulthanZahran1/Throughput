package api

import (
	"net/http"

	"throughput-backend/internal/models"
	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type ProgressHandler struct {
	svc *services.ProgressService
}

func NewProgressHandler(svc *services.ProgressService) *ProgressHandler {
	return &ProgressHandler{svc: svc}
}

func (h *ProgressHandler) GetProgress(c *gin.Context) {
	deviceID := c.Query("deviceId")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId query parameter required"})
		return
	}

	progress, err := h.svc.GetProgress(c.Request.Context(), deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, progress)
}

func (h *ProgressHandler) SubmitResult(c *gin.Context) {
	levelID := c.Param("levelId")

	var result models.ShiftResult
	if err := c.ShouldBindJSON(&result); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if result.DeviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId required"})
		return
	}

	if err := h.svc.SubmitResult(c.Request.Context(), result.DeviceID, levelID, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
