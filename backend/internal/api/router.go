package api

import (
	"throughput-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, metaSvc *services.MetaService, runSvc *services.RunService) {
	apiGroup := r.Group("/api")

	// Meta progression
	mh := NewMetaHandler(metaSvc)
	apiGroup.GET("/meta", mh.GetMeta)
	apiGroup.PUT("/meta", mh.UpdateMeta)

	// Runs
	rh := NewRunHandler(runSvc)
	apiGroup.POST("/runs", rh.SubmitRun)
}
