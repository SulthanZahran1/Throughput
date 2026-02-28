package services

import (
	"context"

	"throughput-backend/internal/models"
	"throughput-backend/internal/storage"
)

type ProgressService struct {
	db *storage.DB
}

func NewProgressService(db *storage.DB) *ProgressService {
	return &ProgressService{db: db}
}

func (s *ProgressService) GetProgress(ctx context.Context, deviceID string) (*models.ProgressResponse, error) {
	records, err := s.db.GetProgress(ctx, deviceID)
	if err != nil {
		return nil, err
	}

	completed := make(map[string]*models.LevelProgress, len(records))
	totalStars := 0
	var features []string

	for i := range records {
		p := &records[i]
		completed[p.LevelID] = p
		totalStars += p.Stars
	}

	if features == nil {
		features = []string{}
	}

	return &models.ProgressResponse{
		DeviceID:         deviceID,
		CompletedLevels:  completed,
		UnlockedFeatures: features,
		TotalStars:       totalStars,
	}, nil
}

func (s *ProgressService) SubmitResult(ctx context.Context, deviceID, levelID string, result *models.ShiftResult) error {
	return s.db.UpsertProgress(ctx, deviceID, levelID, result)
}
