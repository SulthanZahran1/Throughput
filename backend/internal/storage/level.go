package storage

import (
	"context"
	"encoding/json"
	"fmt"

	"throughput-backend/internal/models"
)

func (db *DB) GetAllLevels(ctx context.Context) ([]models.LevelDefinition, error) {
	rows, err := db.Pool.Query(ctx, `SELECT id, name, description, act, definition, created_at FROM levels ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("querying levels: %w", err)
	}
	defer rows.Close()

	var levels []models.LevelDefinition
	for rows.Next() {
		var l models.LevelDefinition
		if err := rows.Scan(&l.ID, &l.Name, &l.Description, &l.Act, &l.Definition, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning level: %w", err)
		}
		levels = append(levels, l)
	}
	return levels, rows.Err()
}

func (db *DB) GetLevelByID(ctx context.Context, id string) (*models.LevelDefinition, error) {
	var l models.LevelDefinition
	err := db.Pool.QueryRow(ctx,
		`SELECT id, name, description, act, definition, created_at FROM levels WHERE id = $1`, id,
	).Scan(&l.ID, &l.Name, &l.Description, &l.Act, &l.Definition, &l.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("querying level %s: %w", id, err)
	}
	return &l, nil
}

func (db *DB) SeedLevels(ctx context.Context, levels []models.LevelDefinition) error {
	for _, l := range levels {
		defBytes, err := json.Marshal(json.RawMessage(l.Definition))
		if err != nil {
			return fmt.Errorf("marshaling level %s: %w", l.ID, err)
		}

		_, err = db.Pool.Exec(ctx,
			`INSERT INTO levels (id, name, description, act, definition)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, act = $4, definition = $5`,
			l.ID, l.Name, l.Description, l.Act, defBytes,
		)
		if err != nil {
			return fmt.Errorf("seeding level %s: %w", l.ID, err)
		}
	}
	return nil
}
