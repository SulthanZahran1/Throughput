import { describe, it, expect } from 'vitest';
import { updateOrderDeadlines, generateOrders } from '../orders';
import type { Order, OrderWave, ItemType } from '../types';

function createOrder(
    itemType: ItemType,
    createdAt: number,
    deadline: number,
    status: Order['status'] = 'pending'
): Order {
    return {
        id: `order-${itemType}-${createdAt}`,
        itemType,
        createdAt,
        deadline,
        status,
    };
}

describe('updateOrderDeadlines', () => {
    it('should mark expired orders as failed', () => {
        const orders: Order[] = [
            createOrder('red', 0, 10, 'pending'), // deadline passed
            createOrder('blue', 0, 20, 'pending'), // still has time
        ];

        const result = updateOrderDeadlines(orders, 15);

        expect(result.orders[0].status).toBe('failed');
        expect(result.orders[1].status).toBe('pending');
        expect(result.justFailed).toBe(1);
    });

    it('should not mark already completed orders as failed', () => {
        const orders: Order[] = [
            createOrder('red', 0, 10, 'completed'), // already completed
        ];

        const result = updateOrderDeadlines(orders, 15);

        expect(result.orders[0].status).toBe('completed');
        expect(result.justFailed).toBe(0);
    });

    it('should not mark already failed orders again', () => {
        const orders: Order[] = [
            createOrder('red', 0, 10, 'failed'), // already failed
        ];

        const result = updateOrderDeadlines(orders, 15);

        expect(result.orders[0].status).toBe('failed');
        expect(result.justFailed).toBe(0); // Not "just" failed
    });

    it('should count multiple newly failed orders', () => {
        const orders: Order[] = [
            createOrder('red', 0, 10, 'pending'),
            createOrder('blue', 0, 10, 'pending'),
            createOrder('green', 0, 20, 'pending'), // not expired
        ];

        const result = updateOrderDeadlines(orders, 15);

        expect(result.justFailed).toBe(2);
    });
});

describe('generateOrders', () => {
    const defaultWave: OrderWave = {
        startTime: 0,
        endTime: 100,
        ordersPerMinute: 60, // 1 per second
        itemDistribution: [
            { type: 'red' as ItemType, weight: 1 },
            { type: 'blue' as ItemType, weight: 1 },
        ],
        timerRange: { min: 30, max: 60 },
    };

    it('should not generate orders when shift is ending', () => {
        const result = generateOrders([], {
            realTime: 10,
            lastOrderTime: 0,
            shiftTime: 0, // Shift ended
            orderSchedule: [defaultWave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders).toHaveLength(0);
        expect(result.newLastOrderTime).toBe(0);
    });

    it('should not generate orders before interval', () => {
        const result = generateOrders([], {
            realTime: 0.5, // Only 0.5s passed
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [defaultWave], // 1 per second
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders).toHaveLength(0);
    });

    it('should generate order when interval passed', () => {
        const result = generateOrders([], {
            realTime: 1.1, // 1.1s passed, interval is 1s
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [defaultWave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders).toHaveLength(1);
        expect(result.newLastOrderTime).toBe(1.1);
        expect(result.orders[0].status).toBe('pending');
    });

    it('should use item from distribution', () => {
        const wave: OrderWave = {
            startTime: 0,
            endTime: 100,
            ordersPerMinute: 60,
            itemDistribution: [{ type: 'red' as ItemType, weight: 1 }], // Only red
            timerRange: { min: 30, max: 30 },
        };

        const result = generateOrders([], {
            realTime: 1,
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [wave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders[0].itemType).toBe('red');
    });

    it('should set deadline based on timer range', () => {
        const wave: OrderWave = {
            startTime: 0,
            endTime: 100,
            ordersPerMinute: 60,
            itemDistribution: [{ type: 'red' as ItemType, weight: 1 }],
            timerRange: { min: 30, max: 30 }, // Fixed 30s
        };

        const result = generateOrders([], {
            realTime: 10,
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [wave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders[0].createdAt).toBe(10);
        expect(result.orders[0].deadline).toBe(40); // 10 + 30
    });

    it('should append to existing orders', () => {
        const existingOrders: Order[] = [
            createOrder('red', 0, 100, 'pending'),
        ];

        const result = generateOrders(existingOrders, {
            realTime: 1,
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [defaultWave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders).toHaveLength(2);
    });

    it('should not generate when no active wave', () => {
        const wave: OrderWave = {
            startTime: 10,
            endTime: 100,
            ordersPerMinute: 60,
            itemDistribution: [{ type: 'red' as ItemType, weight: 1 }],
            timerRange: { min: 30, max: 30 },
        };

        const result = generateOrders([], {
            realTime: 5, // Before wave starts
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [wave],
            availableItemTypes: ['red', 'blue'],
        });

        expect(result.orders).toHaveLength(0);
    });

    it('should use fallback types when distribution is empty', () => {
        const wave: OrderWave = {
            startTime: 0,
            endTime: 100,
            ordersPerMinute: 60,
            itemDistribution: [], // Empty
            timerRange: { min: 30, max: 30 },
        };

        const result = generateOrders([], {
            realTime: 1,
            lastOrderTime: 0,
            shiftTime: 100,
            orderSchedule: [wave],
            availableItemTypes: ['green', 'yellow'],
        });

        expect(result.orders).toHaveLength(1);
        // Should use one of the fallback types
        expect(['green', 'yellow']).toContain(result.orders[0].itemType);
    });
});
