import type { Grid, Item, Zone, Order, RetrievalMode, Slot, ItemType } from '../types/game';
// import { toKey } from '../utils/coordinates';

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

    // 4. Fallback: Find nearest empty slot in unassigned area (or any empty slot if no zones match)
    // For now, let's just find the nearest empty slot to IO port that isn't in a restricted zone?
    // Actually, if a slot is in a zone that DOESN'T accept the item, we shouldn't put it there?
    // The plan says: "Fallback: If no valid zone has empty slots, use nearest empty unassigned cell"

    return findNearestEmptyUnassignedSlot(grid, zones, item.type);
}

function findBestSlotInZone(zone: Zone, grid: Grid): Slot | null {
    let bestSlot: Slot | null = null;
    let minDistance = Infinity;

    // Iterate over all cells in the zone
    for (const cellKey of zone.cells) {
        const slot = grid.slots.get(cellKey);
        if (!slot || slot.state !== 'empty') continue;

        // Distance to IO port (Manhattan or Euclidean? Manhattan is fine for grid)
        const dist = Math.abs(slot.x - grid.ioPort.x) + Math.abs(slot.y - grid.ioPort.y);

        if (dist < minDistance) {
            minDistance = dist;
            bestSlot = slot;
        }
    }

    return bestSlot;
}

function findNearestEmptyUnassignedSlot(grid: Grid, _zones: Zone[], _itemType: ItemType): Slot | null {
    let bestSlot: Slot | null = null;
    let minDistance = Infinity;

    // Create a set of all assigned cells to quickly check if a cell is unassigned
    // OR check if the cell belongs to a zone that REJECTS the item?
    // Plan says "unassigned cell".

    // Optimization: Iterate through all slots? Grid might be large.
    // But for MVP (max 30x30), 900 slots is fine.

    for (const slot of grid.slots.values()) {
        if (slot.state !== 'empty') continue;

        // Check if slot is in ANY zone
        // We can check slot.zoneId, but that only tells us the primary zone.
        // If a slot is in Zone A (accepts Red) and Zone B (accepts Blue), and we have Green...
        // If it's in ANY zone, is it "unassigned"? No.
        // So we should check if it has a zoneId.

        if (slot.zoneId) continue; // It's assigned to a zone

        const dist = Math.abs(slot.x - grid.ioPort.x) + Math.abs(slot.y - grid.ioPort.y);
        if (dist < minDistance) {
            minDistance = dist;
            bestSlot = slot;
        }
    }

    return bestSlot;
}

/**
 * Finds the best order to fulfill based on retrieval mode.
 */
export function findBestRetrieval(
    orders: Order[],
    grid: Grid,
    mode: RetrievalMode,
    cranePosition: { x: number; y: number }
): { order: Order; slot: Slot } | null {
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    if (pendingOrders.length === 0) return null;

    // Sort orders based on mode
    let sortedOrders = [...pendingOrders];

    if (mode === 'fifo') {
        sortedOrders.sort((a, b) => a.createdAt - b.createdAt);
    } else if (mode === 'deadline') {
        sortedOrders.sort((a, b) => a.deadline - b.deadline);
    } else if (mode === 'nearest') {
        // This is tricky because "nearest" depends on where the item is.
        // We need to find the item for each order first.
    }

    // Try to find an item for the orders in sequence
    for (const order of sortedOrders) {
        const slot = findItemForOrder(order, grid, cranePosition, mode === 'nearest');
        if (slot) {
            return { order, slot };
        }
    }

    return null;
}

function findItemForOrder(
    order: Order,
    grid: Grid,
    cranePosition: { x: number; y: number },
    minimizeDistance: boolean
): Slot | null {
    // Find all slots containing the requested item type
    const candidateSlots: Slot[] = [];
    for (const slot of grid.slots.values()) {
        if (slot.state === 'occupied' && slot.item?.type === order.itemType) {
            candidateSlots.push(slot);
        }
    }

    if (candidateSlots.length === 0) return null;

    // If minimizing distance, pick closest to crane
    if (minimizeDistance) {
        candidateSlots.sort((a, b) => {
            const distA = Math.abs(a.x - cranePosition.x) + Math.abs(a.y - cranePosition.y);
            const distB = Math.abs(b.x - cranePosition.x) + Math.abs(b.y - cranePosition.y);
            return distA - distB;
        });
    } else {
        // Default: Pick oldest item? Or closest to IO?
        // Usually FIFO for items (oldest first) to prevent stagnation.
        candidateSlots.sort((a, b) => (a.item!.storedAt - b.item!.storedAt));
    }

    return candidateSlots[0];
}
