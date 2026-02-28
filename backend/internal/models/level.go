package models

import (
	"encoding/json"
	"time"
)

type LevelDefinition struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Act         int             `json:"act"`
	Definition  json.RawMessage `json:"definition"`
	CreatedAt   time.Time       `json:"createdAt"`
}
