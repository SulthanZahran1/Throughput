package models

import "time"

type LevelProgress struct {
	ID            int        `json:"id"`
	DeviceID      string     `json:"deviceId"`
	LevelID       string     `json:"levelId"`
	Stars         int        `json:"stars"`
	BestJph       float64    `json:"bestJph"`
	BestCycleTime float64    `json:"bestCycleTime"`
	Attempts      int        `json:"attempts"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type ShiftResult struct {
	DeviceID        string  `json:"deviceId"`
	OrdersCompleted int     `json:"ordersCompleted"`
	OrdersFailed    int     `json:"ordersFailed"`
	AvgCycleTime    float64 `json:"avgCycleTime"`
	Jph             float64 `json:"jph"`
	Duration        float64 `json:"duration"`
	StarsEarned     int     `json:"starsEarned"`
	Outcome         string  `json:"outcome"`
}

type ProgressResponse struct {
	DeviceID         string                    `json:"deviceId"`
	CompletedLevels  map[string]*LevelProgress `json:"completedLevels"`
	UnlockedFeatures []string                  `json:"unlockedFeatures"`
	TotalStars       int                       `json:"totalStars"`
}
