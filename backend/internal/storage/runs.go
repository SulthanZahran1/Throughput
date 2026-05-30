package storage

import (
	"context"
	"encoding/json"
	"fmt"

	"throughput-backend/internal/models"
)

// InsertRun inserts a run record into the database.
func (db *DB) InsertRun(ctx context.Context, r *models.RunSubmission) (*models.Run, error) {
	upgradesJSON, err := json.Marshal(r.UpgradesHeld)
	if err != nil {
		return nil, fmt.Errorf("marshal upgrades_held: %w", err)
	}

	var run models.Run
	err = db.Pool.QueryRow(ctx,
		`INSERT INTO runs (device_id, seed, difficulty, shifts_survived, total_orders_completed, total_orders_failed, final_hp, max_hp, score, crates_earned, upgrades_held, won)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, device_id, seed, difficulty, shifts_survived, total_orders_completed, total_orders_failed, final_hp, max_hp, score, crates_earned, upgrades_held, won, created_at`,
		r.DeviceID, r.Seed, r.Difficulty, r.ShiftsSurvived, r.TotalOrdersCompleted,
		r.TotalOrdersFailed, r.FinalHp, r.MaxHp, r.Score, r.CratesEarned, upgradesJSON, r.Won,
	).Scan(&run.ID, &run.DeviceID, &run.Seed, &run.Difficulty, &run.ShiftsSurvived,
		&run.TotalOrdersCompleted, &run.TotalOrdersFailed, &run.FinalHp, &run.MaxHp,
		&run.Score, &run.CratesEarned, &upgradesJSON, &run.Won, &run.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("inserting run: %w", err)
	}

	if err := json.Unmarshal(upgradesJSON, &run.UpgradesHeld); err != nil {
		return nil, fmt.Errorf("unmarshal upgrades_held: %w", err)
	}

	return &run, nil
}

// GetRunsByDevice retrieves run history for a device.
func (db *DB) GetRunsByDevice(ctx context.Context, deviceID string, limit int) ([]models.Run, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, device_id, seed, difficulty, shifts_survived, total_orders_completed, total_orders_failed, final_hp, max_hp, score, crates_earned, upgrades_held, won, created_at
		 FROM runs WHERE device_id = $1 ORDER BY created_at DESC LIMIT $2`, deviceID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("querying runs for device %s: %w", deviceID, err)
	}
	defer rows.Close()

	var runs []models.Run
	for rows.Next() {
		var r models.Run
		var upgradesJSON []byte
		if err := rows.Scan(&r.ID, &r.DeviceID, &r.Seed, &r.Difficulty, &r.ShiftsSurvived,
			&r.TotalOrdersCompleted, &r.TotalOrdersFailed, &r.FinalHp, &r.MaxHp,
			&r.Score, &r.CratesEarned, &upgradesJSON, &r.Won, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning run: %w", err)
		}
		if err := json.Unmarshal(upgradesJSON, &r.UpgradesHeld); err != nil {
			return nil, fmt.Errorf("unmarshal upgrades_held: %w", err)
		}
		runs = append(runs, r)
	}
	return runs, rows.Err()
}
