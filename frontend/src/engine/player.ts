import type { Player, Item, GridSlot, UpgradeId, Robot } from '../types/game';
import { getPlayerSpeedMultiplier, getPickupRadius } from './upgrades';

/**
 * Check if a cell is blocked by a robot
 */
export const isCellBlockedByRobot = (x: number, y: number, robots: Robot[]): boolean => {
    return robots.some(robot => robot.x === x && robot.y === y);
};

export const tryMovePlayer = (
    player: Player,
    dx: number,
    dy: number,
    robots: Robot[],
    gridSize: number
): { x: number, y: number } => {
    const newX = Math.max(0, Math.min(gridSize - 1, player.x + dx));
    const newY = Math.max(0, Math.min(gridSize - 1, player.y + dy));

    // Check for robot collision - player cannot move into a cell with a robot
    if (isCellBlockedByRobot(newX, newY, robots)) {
        return { x: player.x, y: player.y }; // Stay in place
    }

    return { x: newX, y: newY };
};

/**
 * Find the best move for the player to reach a target while avoiding robots
 */
export const findSmarterMove = (
    player: { x: number, y: number },
    target: { x: number, y: number },
    robots: Robot[],
    gridSize: number
): { x: number, y: number } => {
    const dx = target.x - player.x;
    const dy = target.y - player.y;

    if (dx === 0 && dy === 0) return player;

    const distanceToTarget = (x: number, y: number): number => {
        return Math.abs(target.x - x) + Math.abs(target.y - y);
    };

    const directions = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    const currentDist = distanceToTarget(player.x, player.y);
    const moves = directions
        .map(dir => ({
            x: player.x + dir.x,
            y: player.y + dir.y,
            dir
        }))
        .filter(m => m.x >= 0 && m.x < gridSize && m.y >= 0 && m.y < gridSize)
        .map(m => {
            const dist = distanceToTarget(m.x, m.y);
            let priority = 3; // default: away
            if (dist < currentDist) {
                // Closer! Prefer horizontal if dx is larger, or if we are already horizontal
                const isHorizontal = m.dir.x !== 0;
                const matchesDxSign = isHorizontal && Math.sign(m.dir.x) === Math.sign(dx);
                const matchesDySign = !isHorizontal && Math.sign(m.dir.y) === Math.sign(dy);

                if (matchesDxSign || matchesDySign) {
                    priority = (isHorizontal && Math.abs(dx) >= Math.abs(dy)) ? 0 : 1;
                } else {
                    priority = 2; // move closer but not directly? (shouldn't happen with cardinal)
                }
            } else if (dist === currentDist) {
                priority = 2; // perpendicular
            }
            return { ...m, priority };
        })
        .sort((a, b) => a.priority - b.priority);

    for (const move of moves) {
        if (!isCellBlockedByRobot(move.x, move.y, robots)) {
            return { x: move.x, y: move.y };
        }
    }

    return player; // Completely blocked
};


export const tryPickupItem = (
    player: Player,
    grid: GridSlot[][],
    items: Item[]
): { player: Player, grid: GridSlot[][], items: Item[] } | null => {
    if (player.carrying) return null;

    const pickupRadius = player.pickupRadius;

    // Check for items on the ground within pickup radius (robust to fractional drift)
    const itemIndex = items.findIndex(i => {
        const dx = Math.abs(Math.round(i.x) - player.x);
        const dy = Math.abs(Math.round(i.y) - player.y);
        return dx <= pickupRadius && dy <= pickupRadius;
    });

    if (itemIndex !== -1) {
        const item = { ...items[itemIndex], status: 'carried' as const, carrierId: 'player' };
        const newItems = [...items];
        newItems.splice(itemIndex, 1);
        return {
            player: { ...player, carrying: item },
            grid, // Grid unchanged
            items: newItems
        };
    }

    // Check grid slot (if we implement placing items in slots later)
    return null;
};

/**
 * Apply upgrade effects to player stats
 */
export const applyPlayerUpgrades = (player: Player, upgrades: UpgradeId[]): Player => {
    return {
        ...player,
        speedMultiplier: getPlayerSpeedMultiplier(upgrades),
        pickupRadius: getPickupRadius(upgrades),
    };
};

