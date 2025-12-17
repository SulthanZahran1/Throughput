import type { Player, Item, GridSlot, UpgradeId } from '../types/game';
import { GRID_SIZE } from '../constants/config';
import { getPlayerSpeedMultiplier, getPickupRadius } from './upgrades';

export const tryMovePlayer = (player: Player, dx: number, dy: number): { x: number, y: number } => {
    const newX = Math.max(0, Math.min(GRID_SIZE - 1, player.x + dx));
    const newY = Math.max(0, Math.min(GRID_SIZE - 1, player.y + dy));
    return { x: newX, y: newY };
};

export const tryPickupItem = (
    player: Player,
    grid: GridSlot[][],
    items: Item[]
): { player: Player, grid: GridSlot[][], items: Item[] } | null => {
    if (player.carrying) return null;

    const pickupRadius = player.pickupRadius;

    // Check for items on the ground within pickup radius
    const itemIndex = items.findIndex(i => {
        const dx = Math.abs(i.x - player.x);
        const dy = Math.abs(i.y - player.y);
        return dx <= pickupRadius && dy <= pickupRadius;
    });

    if (itemIndex !== -1) {
        const item = items[itemIndex];
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

