import type { Order, ItemType, Item } from '../types/game';
import { ORDER_TIMEOUT, IO_PORT } from '../constants/config';

interface OrderWithItem {
    order: Order;
    item: Item;
}

/**
 * Spawn an order AND its paired item together.
 * This guarantees 1:1 relationship between orders and items.
 */
export const spawnOrderWithItem = (
    existingItems: Item[],
    _currentTime: number,
    timeExtension: number = 0
): OrderWithItem => {
    const types: ItemType[] = ['red', 'blue', 'green'];
    const type = types[Math.floor(Math.random() * types.length)];
    const totalTime = ORDER_TIMEOUT + timeExtension;

    const orderId = Math.random().toString(36).substr(2, 9);
    const itemId = `item-${orderId}`;

    // Create the paired item
    let itemX = IO_PORT.x + 3 + Math.floor(Math.random() * 8);
    let itemY = IO_PORT.y + Math.floor(Math.random() * 7) - 3;

    // Avoid spawning on top of existing items
    const occupiedPositions = existingItems.map(i => `${Math.round(i.x)},${Math.round(i.y)}`);
    let attempts = 0;
    while (occupiedPositions.includes(`${Math.round(itemX)},${Math.round(itemY)}`) && attempts < 10) {
        itemX = IO_PORT.x + 3 + Math.floor(Math.random() * 10);
        itemY = IO_PORT.y + Math.floor(Math.random() * 9) - 4;
        attempts++;
    }

    const item: Item = {
        id: itemId,
        type,
        x: itemX,
        y: itemY,
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

export const updateOrders = (orders: Order[], delta: number): { activeOrders: Order[], failedCount: number, failedItemIds: string[] } => {
    let failedCount = 0;
    const failedItemIds: string[] = [];

    const activeOrders = orders.filter(order => {
        order.timeLeft -= delta;
        if (order.timeLeft <= 0) {
            failedCount++;
            failedItemIds.push(order.itemId);
            return false;
        }
        return true;
    });

    return { activeOrders, failedCount, failedItemIds };
};
