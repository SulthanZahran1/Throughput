package api

import (
	"encoding/json"
	"net/http"

	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type LevelHandler struct {
	svc *services.LevelService
}

func NewLevelHandler(svc *services.LevelService) *LevelHandler {
	return &LevelHandler{svc: svc}
}

func (h *LevelHandler) GetAll(c *gin.Context) {
	levels, err := h.svc.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the full definition JSON for each level
	result := make([]json.RawMessage, 0, len(levels))
	for _, l := range levels {
		result = append(result, l.Definition)
	}
	c.JSON(http.StatusOK, result)
}

func (h *LevelHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	level, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "level not found"})
		return
	}

	// Return the raw level definition JSON
	c.Data(http.StatusOK, "application/json", level.Definition)
}
