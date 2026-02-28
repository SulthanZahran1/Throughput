package storage

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(ctx context.Context, connString string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	db.Pool.Close()
}

func (db *DB) HealthCheck(ctx context.Context) error {
	return db.Pool.Ping(ctx)
}

// RunMigrations executes migration SQL statements in order.
func (db *DB) RunMigrations(ctx context.Context, migrations []Migration) error {
	for _, m := range migrations {
		slog.Info("Running migration", "name", m.Name)
		if _, err := db.Pool.Exec(ctx, m.SQL); err != nil {
			return fmt.Errorf("running migration %s: %w", m.Name, err)
		}
	}
	return nil
}

type Migration struct {
	Name string
	SQL  string
}
