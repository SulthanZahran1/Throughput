package api

import (
	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, levelSvc *services.LevelService, progressSvc *services.ProgressService) {
	apiGroup := r.Group("/api")

	// Levels
	lh := NewLevelHandler(levelSvc)
	apiGroup.GET("/levels", lh.GetAll)
	apiGroup.GET("/levels/:id", lh.GetByID)

	// Progress
	ph := NewProgressHandler(progressSvc)
	apiGroup.GET("/progress", ph.GetProgress)
	apiGroup.POST("/progress/:levelId", ph.SubmitResult)
}
