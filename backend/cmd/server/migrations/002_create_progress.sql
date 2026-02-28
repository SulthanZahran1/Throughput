CREATE TABLE IF NOT EXISTS progress (
    id              SERIAL PRIMARY KEY,
    device_id       TEXT NOT NULL,
    level_id        TEXT NOT NULL REFERENCES levels(id),
    stars           INTEGER NOT NULL DEFAULT 0,
    best_jph        DOUBLE PRECISION NOT NULL DEFAULT 0,
    best_cycle_time DOUBLE PRECISION NOT NULL DEFAULT 0,
    attempts        INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_device_id ON progress(device_id);
