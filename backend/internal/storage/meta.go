package storage

import (
	"context"
	"encoding/json"
	"fmt"

	"throughput-backend/internal/models"
)

// GetMeta retrieves meta-progression for a device.
// Returns nil, nil if no row exists.
func (db *DB) GetMeta(ctx context.Context, deviceID string) (*models.Meta, error) {
	var m models.Meta
	var unlockedCardsJSON, milestonesJSON, bestScoresJSON []byte

	err := db.Pool.QueryRow(ctx,
		`SELECT device_id, crates, unlocked_cards, milestones, best_scores, best_shift, total_runs, total_wins, created_at, updated_at
		 FROM meta WHERE device_id = $1`, deviceID,
	).Scan(&m.DeviceID, &m.Crates, &unlockedCardsJSON, &milestonesJSON, &bestScoresJSON,
		&m.BestShift, &m.TotalRuns, &m.TotalWins, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("querying meta for device %s: %w", deviceID, err)
	}

	if err := json.Unmarshal(unlockedCardsJSON, &m.UnlockedCards); err != nil {
		return nil, fmt.Errorf("unmarshal unlocked_cards: %w", err)
	}
	if err := json.Unmarshal(milestonesJSON, &m.Milestones); err != nil {
		return nil, fmt.Errorf("unmarshal milestones: %w", err)
	}
	if err := json.Unmarshal(bestScoresJSON, &m.BestScores); err != nil {
		return nil, fmt.Errorf("unmarshal best_scores: %w", err)
	}

	return &m, nil
}

// UpsertMeta creates or updates a meta row.
func (db *DB) UpsertMeta(ctx context.Context, m *models.Meta) error {
	unlockedCardsJSON, err := json.Marshal(m.UnlockedCards)
	if err != nil {
		return fmt.Errorf("marshal unlocked_cards: %w", err)
	}
	milestonesJSON, err := json.Marshal(m.Milestones)
	if err != nil {
		return fmt.Errorf("marshal milestones: %w", err)
	}
	bestScoresJSON, err := json.Marshal(m.BestScores)
	if err != nil {
		return fmt.Errorf("marshal best_scores: %w", err)
	}

	_, err = db.Pool.Exec(ctx,
		`INSERT INTO meta (device_id, crates, unlocked_cards, milestones, best_scores, best_shift, total_runs, total_wins, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		 ON CONFLICT (device_id) DO UPDATE SET
			crates = GREATEST(meta.crates, EXCLUDED.crates),
			unlocked_cards = COALESCE((
				SELECT jsonb_agg(DISTINCT val) FROM jsonb_array_elements_text(meta.unlocked_cards || EXCLUDED.unlocked_cards) AS val
			), '[]'::jsonb),
			milestones = COALESCE((
				SELECT jsonb_agg(DISTINCT val) FROM jsonb_array_elements_text(meta.milestones || EXCLUDED.milestones) AS val
			), '[]'::jsonb),
			best_scores = meta.best_scores || EXCLUDED.best_scores,
			best_shift = GREATEST(meta.best_shift, EXCLUDED.best_shift),
			total_runs = GREATEST(meta.total_runs, EXCLUDED.total_runs),
			total_wins = GREATEST(meta.total_wins, EXCLUDED.total_wins),
			updated_at = NOW()`,
		m.DeviceID, m.Crates, unlockedCardsJSON, milestonesJSON, bestScoresJSON,
		m.BestShift, m.TotalRuns, m.TotalWins,
	)
	if err != nil {
		return fmt.Errorf("upserting meta for device %s: %w", m.DeviceID, err)
	}
	return nil
}

// EnsureMeta creates a meta row if it doesn't exist yet.
func (db *DB) EnsureMeta(ctx context.Context, deviceID string) error {
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO meta (device_id) VALUES ($1)
		 ON CONFLICT (device_id) DO NOTHING`, deviceID,
	)
	if err != nil {
		return fmt.Errorf("ensuring meta for device %s: %w", deviceID, err)
	}
	return nil
}

// UpdateMetaBestScores sets best_scores to max of existing and provided values.
func (db *DB) UpdateMetaBestScores(ctx context.Context, deviceID string, scores map[string]int) error {
	scoresJSON, err := json.Marshal(scores)
	if err != nil {
		return fmt.Errorf("marshal best_scores: %w", err)
	}
	_, err = db.Pool.Exec(ctx,
		`UPDATE meta SET
			best_scores = meta.best_scores || $2::jsonb,
			updated_at = NOW()
		 WHERE device_id = $1`, deviceID, scoresJSON,
	)
	if err != nil {
		return fmt.Errorf("updating best_scores for device %s: %w", deviceID, err)
	}
	return nil
}
