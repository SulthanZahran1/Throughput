package storage

import (
	"context"
	"fmt"

	"throughput-backend/internal/models"
)

func (db *DB) GetProgress(ctx context.Context, deviceID string) ([]models.LevelProgress, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, device_id, level_id, stars, best_jph, best_cycle_time, attempts, completed_at, updated_at
		 FROM progress WHERE device_id = $1 ORDER BY level_id`, deviceID,
	)
	if err != nil {
		return nil, fmt.Errorf("querying progress: %w", err)
	}
	defer rows.Close()

	var progress []models.LevelProgress
	for rows.Next() {
		var p models.LevelProgress
		if err := rows.Scan(&p.ID, &p.DeviceID, &p.LevelID, &p.Stars, &p.BestJph,
			&p.BestCycleTime, &p.Attempts, &p.CompletedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning progress: %w", err)
		}
		progress = append(progress, p)
	}
	return progress, rows.Err()
}

func (db *DB) UpsertProgress(ctx context.Context, deviceID string, levelID string, result *models.ShiftResult) error {
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO progress (device_id, level_id, stars, best_jph, best_cycle_time, attempts, completed_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, 1, CASE WHEN $6 = 'win' THEN NOW() ELSE NULL END, NOW())
		 ON CONFLICT (device_id, level_id) DO UPDATE SET
			stars = GREATEST(progress.stars, EXCLUDED.stars),
			best_jph = GREATEST(progress.best_jph, EXCLUDED.best_jph),
			best_cycle_time = CASE
				WHEN progress.best_cycle_time = 0 THEN EXCLUDED.best_cycle_time
				WHEN EXCLUDED.best_cycle_time = 0 THEN progress.best_cycle_time
				ELSE LEAST(progress.best_cycle_time, EXCLUDED.best_cycle_time)
			END,
			attempts = progress.attempts + 1,
			completed_at = CASE WHEN $6 = 'win' THEN COALESCE(progress.completed_at, NOW()) ELSE progress.completed_at END,
			updated_at = NOW()`,
		deviceID, levelID, result.StarsEarned, result.Jph, result.AvgCycleTime, result.Outcome,
	)
	if err != nil {
		return fmt.Errorf("upserting progress for device %s level %s: %w", deviceID, levelID, err)
	}
	return nil
}
