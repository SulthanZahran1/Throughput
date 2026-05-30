package models

import "time"

// Meta represents a player's meta-progression (one row per device).
type Meta struct {
	DeviceID      string         `json:"deviceId"`
	Crates        int            `json:"crates"`
	UnlockedCards []string       `json:"unlockedCards"`
	Milestones    []string       `json:"milestones"`
	BestScores    map[string]int `json:"bestScores"` // difficulty -> score
	BestShift     int            `json:"bestShift"`
	TotalRuns     int            `json:"totalRuns"`
	TotalWins     int            `json:"totalWins"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

// MetaResponse is the public API response for meta.
type MetaResponse struct {
	DeviceID      string         `json:"deviceId"`
	Crates        int            `json:"crates"`
	UnlockedCards []string       `json:"unlockedCards"`
	Milestones    []string       `json:"milestones"`
	BestScores    map[string]int `json:"bestScores"`
	BestShift     int            `json:"bestShift"`
	TotalRuns     int            `json:"totalRuns"`
	TotalWins     int            `json:"totalWins"`
}

// MetaUpdate is the request body for PUT /api/meta.
type MetaUpdate struct {
	Crates        *int           `json:"crates,omitempty"`
	UnlockedCards []string       `json:"unlockedCards,omitempty"`
	Milestones    []string       `json:"milestones,omitempty"`
	BestScores    map[string]int `json:"bestScores,omitempty"`
	BestShift     *int           `json:"bestShift,omitempty"`
	TotalRuns     *int           `json:"totalRuns,omitempty"`
	TotalWins     *int           `json:"totalWins,omitempty"`
}
