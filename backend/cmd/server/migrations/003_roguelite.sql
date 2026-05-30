-- Drop old tables
DROP TABLE IF EXISTS progress;
DROP TABLE IF EXISTS levels;

-- Player meta-progression (one row per device)
CREATE TABLE IF NOT EXISTS meta (
    device_id       TEXT PRIMARY KEY,
    crates          INTEGER NOT NULL DEFAULT 0,
    unlocked_cards  JSONB NOT NULL DEFAULT '[]',
    milestones      JSONB NOT NULL DEFAULT '[]',
    best_scores     JSONB NOT NULL DEFAULT '{}',
    best_shift      INTEGER NOT NULL DEFAULT 0,
    total_runs      INTEGER NOT NULL DEFAULT 0,
    total_wins      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run history (one row per completed/failed run)
CREATE TABLE IF NOT EXISTS runs (
    id                    SERIAL PRIMARY KEY,
    device_id             TEXT NOT NULL REFERENCES meta(device_id),
    seed                  INTEGER NOT NULL,
    difficulty            TEXT NOT NULL DEFAULT 'normal',
    shifts_survived       INTEGER NOT NULL,
    total_orders_completed INTEGER NOT NULL,
    total_orders_failed   INTEGER NOT NULL,
    final_hp              INTEGER NOT NULL,
    max_hp                INTEGER NOT NULL,
    score                 INTEGER NOT NULL,
    crates_earned         INTEGER NOT NULL DEFAULT 0,
    upgrades_held         JSONB NOT NULL DEFAULT '[]',
    won                   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_device_id ON runs(device_id);
CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(score DESC);
