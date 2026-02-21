/**
 * Storage Decision Engine
 * 
 * Pure functions for determining where to store items.
 * No React/Zustand dependencies.
 */

import type { Grid, Item, Zone, Slot, ItemType } from './types';

/**
 * Finds the best slot to store an item based on zone rules.
 */
export function findBestStorageSlot(
    item: Item,
    grid: Grid,
    zones: Zone[]
): Slot | null {
    // 1. Find all valid zones for this item
    const validZones = zones.filter((z) => z.acceptedItems.includes(item.type));

    // 2. Sort zones by priority (descending)
    validZones.sort((a, b) => b.priority - a.priority);

    // 3. Try to find an empty slot in the highest priority zones first
    for (const zone of validZones) {
        const bestSlot = findBestSlotInZone(zone, grid);
        if (bestSlot) return bestSlot;
    }

    // 4. Fallback: Find nearest empty unassigned slot
    return findNearestEmptyUnassignedSlot(grid, zones, item.type);
}

function findBestSlotInZone(zone: Zone, grid: Grid): Slot | null {
    let bestSlot: Slot | null = null;
    let minDistance = Infinity;

    // Iterate over all cells in the zone
    for (const cellKey of zone.cells) {
        const slot = grid.slots.get(cellKey);
        if (!slot || slot.state !== 'empty') continue;

        // Distance to IO port (Manhattan distance)
        const dist = Math.abs(slot.x - grid.ioPort.x) + Math.abs(slot.y - grid.ioPort.y);

        if (dist < minDistance) {
            minDistance = dist;
            bestSlot = slot;
        }
    }

    return bestSlot;
}

function findNearestEmptyUnassignedSlot(
    grid: Grid,
    _zones: Zone[],
    _itemType: ItemType
): Slot | null {
    let bestSlot: Slot | null = null;
    let minDistance = Infinity;

    for (const slot of grid.slots.values()) {
        if (slot.state !== 'empty') continue;

        // Skip slots assigned to any zone
        if (slot.zoneId) continue;

        const dist = Math.abs(slot.x - grid.ioPort.x) + Math.abs(slot.y - grid.ioPort.y);
        if (dist < minDistance) {
            minDistance = dist;
            bestSlot = slot;
        }
    }

    return bestSlot;
}
