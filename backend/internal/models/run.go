package models

import "time"

// Run represents a completed run in the database.
type Run struct {
	ID                   int       `json:"id"`
	DeviceID             string    `json:"deviceId"`
	Seed                 int       `json:"seed"`
	Difficulty           string    `json:"difficulty"`
	ShiftsSurvived       int       `json:"shiftsSurvived"`
	TotalOrdersCompleted int       `json:"totalOrdersCompleted"`
	TotalOrdersFailed    int       `json:"totalOrdersFailed"`
	FinalHp              int       `json:"finalHp"`
	MaxHp                int       `json:"maxHp"`
	Score                int       `json:"score"`
	CratesEarned         int       `json:"cratesEarned"`
	UpgradesHeld         []string  `json:"upgradesHeld"`
	Won                  bool      `json:"won"`
	CreatedAt            time.Time `json:"createdAt"`
}

// RunSubmission is the request body for POST /api/runs.
type RunSubmission struct {
	DeviceID             string   `json:"deviceId"`
	Seed                 int      `json:"seed"`
	Difficulty           string   `json:"difficulty"`
	ShiftsSurvived       int      `json:"shiftsSurvived"`
	TotalOrdersCompleted int      `json:"totalOrdersCompleted"`
	TotalOrdersFailed    int      `json:"totalOrdersFailed"`
	FinalHp              int      `json:"finalHp"`
	MaxHp                int      `json:"maxHp"`
	Score                int      `json:"score"`
	CratesEarned         int      `json:"cratesEarned"`
	UpgradesHeld         []string `json:"upgradesHeld"`
	Won                  bool     `json:"won"`
}
