/**
 * Retrieval Decision Engine
 * 
 * Pure functions for determining which item to retrieve.
 * No React/Zustand dependencies.
 */

import type { Grid, Order, Slot, RetrievalMode } from './types';

/**
 * Result of finding a retrieval target.
 */
export interface RetrievalTarget {
    order: Order;
    slot: Slot;
}

/**
 * Finds the best order to fulfill based on retrieval mode.
 */
export function findBestRetrieval(
    orders: Order[],
    grid: Grid,
    mode: RetrievalMode,
    cranePosition: { x: number; y: number }
): RetrievalTarget | null {
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    if (pendingOrders.length === 0) return null;

    // Sort orders based on mode
    let sortedOrders = [...pendingOrders];

    if (mode === 'fifo') {
        sortedOrders.sort((a, b) => a.createdAt - b.createdAt);
    } else if (mode === 'deadline') {
        sortedOrders.sort((a, b) => a.deadline - b.deadline);
    }
    // 'nearest' mode is handled in findItemForOrder

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
        // Default: Pick oldest item (FIFO for items) to prevent stagnation
        candidateSlots.sort((a, b) => (a.item!.storedAt - b.item!.storedAt));
    }

    return candidateSlots[0];
}
