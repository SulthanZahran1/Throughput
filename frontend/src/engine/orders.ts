/**
 * Order Management Engine
 * 
 * Pure functions for order generation and deadline checking.
 * No React/Zustand dependencies.
 */

import type { Order, OrderWave, ItemType } from './types';

export interface OrderUpdateResult {
    orders: Order[];
    justFailed: number;
}

/**
 * Updates order statuses, marking expired orders as failed.
 */
export function updateOrderDeadlines(
    orders: Order[],
    newRealTime: number
): OrderUpdateResult {
    let justFailed = 0;
    
    const updatedOrders = orders.map((order) => {
        if (order.status === 'pending' && newRealTime > order.deadline) {
            justFailed++;
            return { ...order, status: 'failed' as const };
        }
        return order;
    });

    return { orders: updatedOrders, justFailed };
}

export interface OrderGenerationResult {
    orders: Order[];
    newLastOrderTime: number;
}

/**
 * Generates new orders based on the order schedule.
 */
export function generateOrders(
    currentOrders: Order[],
    context: {
        realTime: number;
        lastOrderTime: number;
        shiftTime: number;
        orderSchedule: OrderWave[];
        availableItemTypes: ItemType[];
    }
): OrderGenerationResult {
    const { realTime, lastOrderTime, shiftTime, orderSchedule, availableItemTypes } = context;
    
    // Don't generate orders if shift is ending
    if (shiftTime <= 0) {
        return { orders: currentOrders, newLastOrderTime: lastOrderTime };
    }

    // Find active wave for current time
    const activeWave = orderSchedule.find(
        wave => realTime >= wave.startTime && realTime < wave.endTime
    );

    if (!activeWave || activeWave.ordersPerMinute <= 0) {
        return { orders: currentOrders, newLastOrderTime: lastOrderTime };
    }

    const orderInterval = 60 / activeWave.ordersPerMinute;
    
    // Not time for a new order yet
    if (realTime - lastOrderTime < orderInterval) {
        return { orders: currentOrders, newLastOrderTime: lastOrderTime };
    }

    // Select item type based on distribution weights
    const selectedType = selectItemType(activeWave.itemDistribution, availableItemTypes);

    // Calculate random timer duration
    const timerDuration = activeWave.timerRange.min +
        Math.random() * (activeWave.timerRange.max - activeWave.timerRange.min);

    const newOrder: Order = {
        id: generateId(),
        itemType: selectedType,
        createdAt: realTime,
        deadline: realTime + timerDuration,
        status: 'pending',
    };

    return {
        orders: [...currentOrders, newOrder],
        newLastOrderTime: realTime,
    };
}

function selectItemType(
    distribution: { type: ItemType; weight: number }[],
    fallbackTypes: ItemType[]
): ItemType {
    if (distribution.length === 0) {
        return fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)] ?? 'red';
    }

    const totalWeight = distribution.reduce((sum, d) => sum + d.weight, 0);
    let rand = Math.random() * totalWeight;
    
    for (const dist of distribution) {
        rand -= dist.weight;
        if (rand <= 0) {
            return dist.type;
        }
    }

    return distribution[0]?.type ?? 'red';
}

function generateId(): string {
    // Simple UUID v4-like generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
