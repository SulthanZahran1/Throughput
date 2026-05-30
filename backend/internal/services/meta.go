package services

import (
	"context"
	"fmt"

	"throughput-backend/internal/models"
	"throughput-backend/internal/storage"
)

type MetaService struct {
	db *storage.DB
}

func NewMetaService(db *storage.DB) *MetaService {
	return &MetaService{db: db}
}

// GetMeta retrieves meta for a device, ensuring a row exists.
func (s *MetaService) GetMeta(ctx context.Context, deviceID string) (*models.MetaResponse, error) {
	if deviceID == "" {
		return nil, fmt.Errorf("deviceId is required")
	}

	// Ensure a meta row exists
	if err := s.db.EnsureMeta(ctx, deviceID); err != nil {
		return nil, fmt.Errorf("ensure meta: %w", err)
	}

	// Fetch the meta
	m, err := s.db.GetMeta(ctx, deviceID)
	if err != nil {
		return nil, fmt.Errorf("get meta: %w", err)
	}
	if m == nil {
		// Should not happen after EnsureMeta, but handle gracefully
		return &models.MetaResponse{
			DeviceID:      deviceID,
			BestScores:    make(map[string]int),
			UnlockedCards: []string{},
			Milestones:    []string{},
		}, nil
	}

	if m.BestScores == nil {
		m.BestScores = make(map[string]int)
	}
	if m.UnlockedCards == nil {
		m.UnlockedCards = []string{}
	}
	if m.Milestones == nil {
		m.Milestones = []string{}
	}

	return &models.MetaResponse{
		DeviceID:      m.DeviceID,
		Crates:        m.Crates,
		UnlockedCards: m.UnlockedCards,
		Milestones:    m.Milestones,
		BestScores:    m.BestScores,
		BestShift:     m.BestShift,
		TotalRuns:     m.TotalRuns,
		TotalWins:     m.TotalWins,
	}, nil
}

// UpdateMeta updates meta for a device. Fields from the update are unioned/merged.
func (s *MetaService) UpdateMeta(ctx context.Context, deviceID string, update *models.MetaUpdate) (*models.MetaResponse, error) {
	if deviceID == "" {
		return nil, fmt.Errorf("deviceId is required")
	}

	// Ensure a meta row exists
	if err := s.db.EnsureMeta(ctx, deviceID); err != nil {
		return nil, fmt.Errorf("ensure meta: %w", err)
	}

	// Get current meta
	current, err := s.db.GetMeta(ctx, deviceID)
	if err != nil {
		return nil, fmt.Errorf("get meta: %w", err)
	}
	if current == nil {
		current = &models.Meta{
			DeviceID:      deviceID,
			BestScores:    make(map[string]int),
			UnlockedCards: []string{},
			Milestones:    []string{},
		}
	}

	// Apply updates
	if update.Crates != nil {
		if *update.Crates > current.Crates {
			current.Crates = *update.Crates
		}
	}
	if update.UnlockedCards != nil {
		existing := map[string]bool{}
		for _, c := range current.UnlockedCards {
			existing[c] = true
		}
		for _, c := range update.UnlockedCards {
			if !existing[c] {
				current.UnlockedCards = append(current.UnlockedCards, c)
			}
		}
	}
	if update.Milestones != nil {
		existing := map[string]bool{}
		for _, m := range current.Milestones {
			existing[m] = true
		}
		for _, m := range update.Milestones {
			if !existing[m] {
				current.Milestones = append(current.Milestones, m)
			}
		}
	}
	if update.BestScores != nil {
		for k, v := range update.BestScores {
			if currentVal, ok := current.BestScores[k]; !ok || v > currentVal {
				current.BestScores[k] = v
			}
		}
	}
	if update.BestShift != nil && *update.BestShift > current.BestShift {
		current.BestShift = *update.BestShift
	}
	if update.TotalRuns != nil && *update.TotalRuns > current.TotalRuns {
		current.TotalRuns = *update.TotalRuns
	}
	if update.TotalWins != nil && *update.TotalWins > current.TotalWins {
		current.TotalWins = *update.TotalWins
	}

	// Persist
	if err := s.db.UpsertMeta(ctx, current); err != nil {
		return nil, fmt.Errorf("upsert meta: %w", err)
	}

	return &models.MetaResponse{
		DeviceID:      current.DeviceID,
		Crates:        current.Crates,
		UnlockedCards: current.UnlockedCards,
		Milestones:    current.Milestones,
		BestScores:    current.BestScores,
		BestShift:     current.BestShift,
		TotalRuns:     current.TotalRuns,
		TotalWins:     current.TotalWins,
	}, nil
}
