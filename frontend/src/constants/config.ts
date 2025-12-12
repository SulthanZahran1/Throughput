// Game configuration constants

// Performance targets from plan.md Section 13.1
export const TICK_RATE = 1000 / 60; // ~16.67ms for 60 FPS

// Crane defaults
export const DEFAULT_CRANE_SPEED = 3; // Cells per second

// Grid defaults (for sandbox/testing)
export const DEFAULT_GRID_WIDTH = 16;
export const DEFAULT_GRID_HEIGHT = 16;

// Game limits
export const MAX_FAILED_ORDERS = 5;
export const MIN_GRID_SIZE = 6;
export const MAX_GRID_SIZE = 30;

// Zone priority range
export const MIN_ZONE_PRIORITY = 1;
export const MAX_ZONE_PRIORITY = 10;
