/**
 * Coordinate utility functions
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type CellKey = string;

/**
 * Convert x,y to cell key "x,y"
 */
export function toKey(x: number, y: number): CellKey {
  return `${x},${y}`;
}

/**
 * Parse cell key "x,y" to coordinates
 */
export function fromKey(key: CellKey): Vec2 {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * Manhattan distance between two points
 */
export function manhattanDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Euclidean distance between two points
 */
export function euclideanDistance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two points are equal
 */
export function isSamePosition(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Get adjacent coordinates (up, right, down, left)
 */
export function getAdjacent(pos: Vec2): Vec2[] {
  return [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x - 1, y: pos.y },
  ];
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}
