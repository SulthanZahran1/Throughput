import type { Order, ItemType, Item } from '../types/game';
import { ORDER_TIMEOUT, getIOPort, FRAGILE_ITEM_DECAY_MULTIPLIER, BASELINE_RECYCLING_XP, XP_PER_ORDER } from '../constants/config';

interface OrderWithItem {
    order: Order;
    item: Item;
}

/**
 * Spawn an order AND its paired item together.
 * This guarantees 1:1 relationship between orders and items.
 * Items spawn in a ring around the center port.
 */
export const spawnOrderWithItem = (
    existingItems: Item[],
    gridSize: number,
    timeExtension: number = 0
): OrderWithItem => {
    const types: ItemType[] = ['red', 'blue', 'green'];
    const type = types[Math.floor(Math.random() * types.length)];
    const totalTime = ORDER_TIMEOUT + timeExtension;

    const orderId = Math.random().toString(36).substr(2, 9);
    const itemId = `item-${orderId}`;

    const ioPort = getIOPort(gridSize);

    // Create the paired item in a ring around center
    // Radius between 3 and (gridSize/2 - 1)
    const minRadius = 3;
    const maxRadius = Math.floor(gridSize / 2) - 1;

    let itemX = 0;
    let itemY = 0;
    let attempts = 0;

    while (attempts < 20) {
        const angle = Math.random() * Math.PI * 2;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        itemX = Math.round(ioPort.x + Math.cos(angle) * radius);
        itemY = Math.round(ioPort.y + Math.sin(angle) * radius);

        // Keep within bounds
        itemX = Math.max(0, Math.min(gridSize - 1, itemX));
        itemY = Math.max(0, Math.min(gridSize - 1, itemY));

        const occupiedPositions = existingItems.map(i => `${Math.round(i.x)},${Math.round(i.y)}`);
        if (!occupiedPositions.includes(`${itemX},${itemY}`)) break;
        attempts++;
    }

    const item: Item = {
        id: itemId,
        type,
        x: itemX,
        y: itemY,
        status: 'on_ground',
    };

    const order: Order = {
        id: orderId,
        type,
        timeLeft: totalTime,
        totalTime,
        itemId,
    };

    return { order, item };
};

export const updateOrders = (
    orders: Order[],
    delta: number,
    itemsOnGround: Item[],
    carriedItemIds: Set<string>
): { activeOrders: Order[], failedCount: number, failedItemIds: string[], expiredXp: number } => {
    let failedCount = 0;
    const failedItemIds: string[] = [];
    let expiredXp = 0;

    const activeOrders = orders.filter(order => {
        // Fragile trait: Blue items decay faster on the ground
        const isOnGround = itemsOnGround.some(i => i.id === order.itemId);
        let decayMultiplier = 1.0;

        if (isOnGround && order.type === 'blue') {
            decayMultiplier = FRAGILE_ITEM_DECAY_MULTIPLIER;
        }

        order.timeLeft -= delta * decayMultiplier;

        if (order.timeLeft <= 0) {
            failedCount++;
            failedItemIds.push(order.itemId);

            // Baseline recycling: only for orders being carried
            if (carriedItemIds.has(order.itemId)) {
                expiredXp += Math.floor(XP_PER_ORDER * BASELINE_RECYCLING_XP);
            }

            return false;
        }
        return true;
    });

    return { activeOrders, failedCount, failedItemIds, expiredXp };
};


