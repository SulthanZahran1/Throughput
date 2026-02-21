import { describe, it, expect } from 'vitest';
import { findBestRetrieval } from '../retrieval';
import type { Grid, Order, Item } from '../types';

function createGrid(width: number, height: number, ioPort = { x: 0, y: 0 }): Grid {
    const slots = new Map();
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            slots.set(`${x},${y}`, {
                x,
                y,
                state: 'empty' as const,
                item: null,
                zoneId: null,
            });
        }
    }
    return { width, height, slots, ioPort };
}

function createItem(type: string, storedAt: number): Item {
    return {
        id: `item-${type}-${storedAt}`,
        type: type as any,
        storedAt,
    };
}

function createOrder(
    itemType: string,
    createdAt: number,
    deadline: number,
    status = 'pending'
): Order {
    return {
        id: `order-${itemType}-${createdAt}`,
        itemType: itemType as any,
        createdAt,
        deadline,
        status: status as any,
    };
}

describe('findBestRetrieval', () => {
    it('should return null when no pending orders', () => {
        const grid = createGrid(4, 4);
        const orders: Order[] = [
            createOrder('red', 0, 100, 'completed'),
            createOrder('blue', 0, 100, 'failed'),
        ];

        const result = findBestRetrieval(orders, grid, 'fifo', { x: 0, y: 0 });
        expect(result).toBeNull();
    });

    it('should return null when item not available', () => {
        const grid = createGrid(4, 4);
        const orders: Order[] = [
            createOrder('red', 0, 100, 'pending'),
        ];

        // No items in grid
        const result = findBestRetrieval(orders, grid, 'fifo', { x: 0, y: 0 });
        expect(result).toBeNull();
    });

    it('should find matching item for FIFO mode', () => {
        const grid = createGrid(4, 4);
        grid.slots.set('2,2', {
            x: 2, y: 2,
            state: 'occupied',
            item: createItem('red', 10),
            zoneId: null,
        });

        const orders: Order[] = [
            createOrder('red', 0, 100, 'pending'),
        ];

        const result = findBestRetrieval(orders, grid, 'fifo', { x: 0, y: 0 });
        expect(result).not.toBeNull();
        expect(result!.order.itemType).toBe('red');
        expect(result!.slot.x).toBe(2);
        expect(result!.slot.y).toBe(2);
    });

    it('should prioritize oldest order in FIFO mode', () => {
        const grid = createGrid(4, 4);
        grid.slots.set('1,1', {
            x: 1, y: 1,
            state: 'occupied',
            item: createItem('blue', 10),
            zoneId: null,
        });
        grid.slots.set('2,2', {
            x: 2, y: 2,
            state: 'occupied',
            item: createItem('red', 10),
            zoneId: null,
        });

        const orders: Order[] = [
            createOrder('blue', 0, 100, 'pending'), // Oldest
            createOrder('red', 50, 150, 'pending'), // Newer
        ];

        const result = findBestRetrieval(orders, grid, 'fifo', { x: 0, y: 0 });
        expect(result).not.toBeNull();
        expect(result!.order.itemType).toBe('blue');
    });

    it('should prioritize earliest deadline in deadline mode', () => {
        const grid = createGrid(4, 4);
        grid.slots.set('1,1', {
            x: 1, y: 1,
            state: 'occupied',
            item: createItem('blue', 10),
            zoneId: null,
        });
        grid.slots.set('2,2', {
            x: 2, y: 2,
            state: 'occupied',
            item: createItem('red', 10),
            zoneId: null,
        });

        const orders: Order[] = [
            createOrder('blue', 0, 200, 'pending'), // Later deadline
            createOrder('red', 50, 100, 'pending'), // Earlier deadline
        ];

        const result = findBestRetrieval(orders, grid, 'deadline', { x: 0, y: 0 });
        expect(result).not.toBeNull();
        expect(result!.order.itemType).toBe('red');
    });

    it('should pick oldest item when multiple available for same order', () => {
        const grid = createGrid(4, 4);
        grid.slots.set('1,1', {
            x: 1, y: 1,
            state: 'occupied',
            item: createItem('red', 50), // Newer
            zoneId: null,
        });
        grid.slots.set('2,2', {
            x: 2, y: 2,
            state: 'occupied',
            item: createItem('red', 10), // Older (should be picked)
            zoneId: null,
        });

        const orders: Order[] = [
            createOrder('red', 0, 100, 'pending'),
        ];

        const result = findBestRetrieval(orders, grid, 'fifo', { x: 0, y: 0 });
        expect(result).not.toBeNull();
        expect(result!.slot.x).toBe(2);
        expect(result!.slot.y).toBe(2);
    });

    it('should pick closest item in nearest mode', () => {
        const grid = createGrid(4, 4);
        const cranePos = { x: 0, y: 0 };

        grid.slots.set('3,3', {
            x: 3, y: 3,
            state: 'occupied',
            item: createItem('red', 10),
            zoneId: null,
        });
        grid.slots.set('1,1', {
            x: 1, y: 1,
            state: 'occupied',
            item: createItem('red', 50), // Newer but closer
            zoneId: null,
        });

        const orders: Order[] = [
            createOrder('red', 0, 100, 'pending'),
        ];

        const result = findBestRetrieval(orders, grid, 'nearest', cranePos);
        expect(result).not.toBeNull();
        expect(result!.slot.x).toBe(1); // Closest to (0,0)
        expect(result!.slot.y).toBe(1);
    });
});
