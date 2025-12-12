// Coordinate utility functions for grid operations

/**
 * Converts x,y coordinates to a string key for Map storage
 */
export function toKey(x: number, y: number): string {
    return `${x},${y}`;
}

/**
 * Parses a coordinate key back to x,y values
 */
export function fromKey(key: string): { x: number; y: number } {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

/**
 * Calculates Manhattan distance between two points
 */
export function manhattanDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Calculates Euclidean distance between two points
 */
export function euclideanDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Checks if coordinates are within grid bounds
 */
export function isInBounds(
    x: number,
    y: number,
    width: number,
    height: number
): boolean {
    return x >= 0 && x < width && y >= 0 && y < height;
}
