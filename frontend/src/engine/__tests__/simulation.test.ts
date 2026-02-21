import { describe, it, expect } from 'vitest';
import { tickSimulation, createCrane } from '../simulation';
import type { SimulationContext, Grid, ItemType } from '../types';

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

function createContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
    const grid = createGrid(4, 4, { x: 0, y: 0 });
    
    return {
        shiftTime: 300,
        realTime: 0,
        grid,
        crane: createCrane(0, 0),
        orders: [],
        zones: [],
        retrievalMode: 'fifo',
        craneMode: 'single',
        stats: {
            ordersCompleted: 0,
            ordersFailed: 0,
            totalCycleTime: 0,
            totalTravelDistance: 0,
        },
        shiftDuration: 300,
        lastOrderTime: -999,
        availableItemTypes: ['red', 'blue'] as ItemType[],
        orderSchedule: [
            {
                startTime: 0,
                endTime: 300,
                ordersPerMinute: 12, // 1 every 5 seconds
                itemDistribution: [
                    { type: 'red' as ItemType, weight: 1 },
                    { type: 'blue' as ItemType, weight: 1 },
                ],
                timerRange: { min: 60, max: 120 },
            },
        ],
        ...overrides,
    };
}

describe('tickSimulation', () => {
    it('should decrement shift time', () => {
        const context = createContext({ shiftTime: 100 });
        
        const result = tickSimulation(context, 1);

        expect(result.state.shiftTime).toBe(99);
    });

    it('should increment real time', () => {
        const context = createContext({ realTime: 10 });
        
        const result = tickSimulation(context, 1.5);

        expect(result.state.realTime).toBe(11.5);
    });

    it('should not go below 0 for shift time', () => {
        const context = createContext({ shiftTime: 0.5 });
        
        const result = tickSimulation(context, 1);

        expect(result.state.shiftTime).toBe(0);
    });

    it('should generate orders based on schedule', () => {
        const context = createContext({
            realTime: 0,
            lastOrderTime: -999,
            orderSchedule: [{
                startTime: 0,
                endTime: 300,
                ordersPerMinute: 60, // 1 per second
                itemDistribution: [{ type: 'red' as ItemType, weight: 1 }],
                timerRange: { min: 30, max: 30 },
            }],
        });

        const result = tickSimulation(context, 1.1);

        expect(result.state.orders.length).toBeGreaterThan(0);
    });

    it('should mark expired orders as failed', () => {
        const context = createContext({
            orders: [
                {
                    id: 'order-1',
                    itemType: 'red',
                    createdAt: 0,
                    deadline: 10,
                    status: 'pending',
                },
            ],
            realTime: 5,
        });

        const result = tickSimulation(context, 10); // Now at 15, past deadline

        expect(result.state.orders[0].status).toBe('failed');
        expect(result.state.stats.ordersFailed).toBe(1);
    });

    it('should move crane to IO when IDLE', () => {
        const context = createContext({
            crane: createCrane(2, 2), // Not at IO
        });

        const result = tickSimulation(context, 0.1);

        // Crane should be moving toward IO
        expect(result.state.crane.state).toBe('MOVING');
    });

    it('should process crane state during tick', () => {
        // Test that crane busy time decreases during tick
        const context = createContext({
            crane: {
                ...createCrane(0, 0),
                state: 'MOVING',
                busyTimeRemaining: 1.0,
                targetX: 3,
                targetY: 0,
                mission: { type: 'STORE', targetX: 3, targetY: 0, item: { id: 'item-1', type: 'red', storedAt: 0 } },
            },
        });

        const result = tickSimulation(context, 0.3);
        
        // Crane busy time should decrease
        expect(result.state.crane.busyTimeRemaining).toBe(0.7);
        expect(result.state.crane.state).toBe('MOVING');
    });

    it('should update crane busy time during tick', () => {
        // Setup: crane in MOVING state
        const context = createContext({
            crane: {
                ...createCrane(0, 0),
                state: 'MOVING',
                busyTimeRemaining: 1.0,
                targetX: 3,
                targetY: 0,
            },
        });

        const result = tickSimulation(context, 0.3);
        
        // Crane busy time should decrease
        expect(result.state.crane.busyTimeRemaining).toBe(0.7);
        expect(result.state.crane.state).toBe('MOVING');
    });

    it('should not generate orders when shift time is 0', () => {
        const context = createContext({
            shiftTime: 0,
            lastOrderTime: 0,
        });

        const result = tickSimulation(context, 10);

        expect(result.state.orders.length).toBe(0);
    });

    it('should return actions from tick', () => {
        // Crane mid-transfer should produce actions when complete
        const context = createContext({
            crane: {
                ...createCrane(0, 0),
                state: 'TRANSFERRING',
                busyTimeRemaining: 0.05, // About to complete
                mission: { type: 'STORE', targetX: 0, targetY: 0, item: { id: 'item-1', type: 'red', storedAt: 0 } },
            },
        });

        const result = tickSimulation(context, 0.1);

        // Should have actions from the transfer completing
        expect(result.actions.length).toBeGreaterThan(0);
    });
});
