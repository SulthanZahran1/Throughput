/**
 * Game tuning constants
 */

// Grid
export const GRID_CELL_SIZE = 48; // pixels
export const GRID_GAP = 2; // pixels

// Timing
export const DEFAULT_SHIFT_TIME = 120; // seconds
export const ORDER_SPAWN_RATE = 5; // seconds between orders
export const ORDER_DEADLINE_BASE = 30; // seconds

// HP
export const INITIAL_HP = 5;
export const HP_LOSS_PER_FAILED_ORDER = 1;

// Difficulty multipliers
export const DIFFICULTY_MULTIPLIERS = {
  normal: 1,
  hard: 1.2,
  brutal: 1.5,
} as const;

// Rarity colors
export const RARITY_COLORS = {
  common: '#94a3b8',   // slate-400
  rare: '#38bdf8',     // sky-400
  epic: '#c084fc',     // purple-400
} as const;

// Item colors
export const ITEM_COLORS: Record<string, string> = {
  red: '#ff4d4d',
  blue: '#00d2ff',
  green: '#33ff88',
  yellow: '#ffcc00',
  purple: '#d946ef',
  orange: '#fb923c',
  cyan: '#22d3ee',
  magenta: '#f472b6',
};

// Slot type colors
export const SLOT_COLORS: Record<string, string> = {
  empty: '#1a1f26',
  blocked: '#0a0c10',
  storage: '#1e293b',
  input: '#064e3b',
  output: '#7f1d1d',
};
