package api

import (
	"net/http"

	"throughput-backend/internal/models"
	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type MetaHandler struct {
	svc *services.MetaService
}

func NewMetaHandler(svc *services.MetaService) *MetaHandler {
	return &MetaHandler{svc: svc}
}

// GetMeta handles GET /api/meta?deviceId=
func (h *MetaHandler) GetMeta(c *gin.Context) {
	deviceID := c.Query("deviceId")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId query parameter required"})
		return
	}

	meta, err := h.svc.GetMeta(c.Request.Context(), deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, meta)
}

// UpdateMeta handles PUT /api/meta?deviceId=
func (h *MetaHandler) UpdateMeta(c *gin.Context) {
	deviceID := c.Query("deviceId")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId query parameter required"})
		return
	}

	var update models.MetaUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	meta, err := h.svc.UpdateMeta(c.Request.Context(), deviceID, &update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, meta)
}
