package services

import (
	"context"
	"fmt"

	"throughput-backend/internal/models"
	"throughput-backend/internal/storage"
)

type RunService struct {
	db *storage.DB
}

func NewRunService(db *storage.DB) *RunService {
	return &RunService{db: db}
}

// SubmitRun inserts a run and updates the corresponding meta row atomically.
func (s *RunService) SubmitRun(ctx context.Context, submission *models.RunSubmission) (*models.Run, error) {
	if submission.DeviceID == "" {
		return nil, fmt.Errorf("deviceId is required")
	}

	// Ensure meta row exists
	if err := s.db.EnsureMeta(ctx, submission.DeviceID); err != nil {
		return nil, fmt.Errorf("ensure meta: %w", err)
	}

	// Insert the run
	run, err := s.db.InsertRun(ctx, submission)
	if err != nil {
		return nil, fmt.Errorf("insert run: %w", err)
	}

	// Update meta stats
	current, err := s.db.GetMeta(ctx, submission.DeviceID)
	if err != nil {
		return nil, fmt.Errorf("get meta after run insert: %w", err)
	}
	if current == nil {
		return nil, fmt.Errorf("meta row not found after ensure")
	}

	// Collect best scores update
	if current.BestScores == nil {
		current.BestScores = make(map[string]int)
	}
	current.BestScores[submission.Difficulty] = maxScore(
		current.BestScores[submission.Difficulty],
		submission.Score,
	)

	// Update aggregated fields
	current.Crates += submission.CratesEarned
	if submission.ShiftsSurvived > current.BestShift {
		current.BestShift = submission.ShiftsSurvived
	}
	current.TotalRuns++
	if submission.Won {
		current.TotalWins++
	}

	if err := s.db.UpsertMeta(ctx, current); err != nil {
		return nil, fmt.Errorf("upsert meta after run: %w", err)
	}

	return run, nil
}

func maxScore(a, b int) int {
	if a > b {
		return a
	}
	return b
}
