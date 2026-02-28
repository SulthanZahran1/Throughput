package services

import (
	"context"

	"throughput-backend/internal/models"
	"throughput-backend/internal/storage"
)

type LevelService struct {
	db *storage.DB
}

func NewLevelService(db *storage.DB) *LevelService {
	return &LevelService{db: db}
}

func (s *LevelService) GetAll(ctx context.Context) ([]models.LevelDefinition, error) {
	return s.db.GetAllLevels(ctx)
}

func (s *LevelService) GetByID(ctx context.Context, id string) (*models.LevelDefinition, error) {
	return s.db.GetLevelByID(ctx, id)
}
