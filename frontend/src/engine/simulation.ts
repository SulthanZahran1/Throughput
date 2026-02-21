/**
 * Simulation Engine
 * 
 * Main tick function for the game simulation.
 * Pure function: takes state + dt, returns new state.
 * No React/Zustand dependencies.
 */

import type {
    SimulationState,
    SimulationContext,
    Grid,
    Crane,
    Order,
    ShiftStats,
    Item,
} from './types';
import { findBestStorageSlot } from './storage';
import { findBestRetrieval } from './retrieval';
import { updateOrderDeadlines, generateOrders } from './orders';
import {
    tickCrane,
    startStoreMission,
    startRetrieveMission,
} from './crane';
import type { CraneAction } from './crane';

// Constants
const ACTION_DELAY = 0.5;

export interface TickResult {
    state: SimulationState;
    actions: SimulationAction[];
}

export type SimulationAction =
    | { type: 'ORDER_COMPLETED'; orderId: string }
    | { type: 'ORDER_FAILED'; orderId: string }
    | { type: 'ITEM_STORED'; slotKey: string; item: Item }
    | { type: 'ITEM_RETRIEVED'; slotKey: string; item: Item }
    | { type: 'CRANE_ACTION'; action: CraneAction };

/**
 * Main simulation tick.
 * Takes the current simulation context and delta time, returns the new state.
 * 
 * This function is pure - it does not mutate the input state.
 */
export function tickSimulation(
    context: SimulationContext,
    dt: number
): TickResult {
    const actions: SimulationAction[] = [];

    // 1. Update time
    const newShiftTime = Math.max(0, context.shiftTime - dt);
    const newRealTime = context.realTime + dt;

    // 2. Update orders (check deadlines)
    const orderUpdate = updateOrderDeadlines(context.orders, newRealTime);
    let newOrders = orderUpdate.orders;
    let statsDelta = { ordersFailed: orderUpdate.justFailed };

    // 3. Auto order generation
    const orderGenResult = generateOrders(newOrders, {
        realTime: newRealTime,
        lastOrderTime: context.lastOrderTime,
        shiftTime: newShiftTime,
        orderSchedule: context.orderSchedule,
        availableItemTypes: context.availableItemTypes,
    });
    newOrders = orderGenResult.orders;
    void orderGenResult.newLastOrderTime; // Intentionally unused - handled by caller

    // 4. Process crane FSM
    let nextCrane = context.crane;
    let nextGrid = context.grid;
    let nextStats: ShiftStats = {
        ...context.stats,
        ordersFailed: context.stats.ordersFailed + statsDelta.ordersFailed,
    };

    if (nextCrane) {
        const craneResult = processCraneTick(
            nextCrane,
            nextGrid,
            newOrders,
            nextStats,
            context,
            dt,
            (simAction) => { actions.push(simAction); }
        );

        nextCrane = craneResult.crane;
        nextGrid = craneResult.grid;
        nextStats = craneResult.stats;
        newOrders = craneResult.orders;
    }

    const newState: SimulationState = {
        shiftTime: newShiftTime,
        realTime: newRealTime,
        grid: nextGrid,
        crane: nextCrane,
        orders: newOrders,
        zones: context.zones,
        retrievalMode: context.retrievalMode,
        craneMode: context.craneMode,
        stats: nextStats,
    };

    return {
        state: newState,
        actions,
    };
}

interface CraneTickContext {
    crane: Crane;
    grid: Grid;
    stats: ShiftStats;
    orders: Order[];
}

function processCraneTick(
    crane: Crane,
    grid: Grid,
    orders: Order[],
    stats: ShiftStats,
    context: SimulationContext,
    dt: number,
    onAction: (action: SimulationAction) => void
): CraneTickContext {
    let nextCrane = crane;
    let nextGrid = grid;
    let nextStats = stats;
    let nextOrders = orders;

    // Helper to find storage slot
    const findStorage = (item: Item) => findBestStorageSlot(item, nextGrid, context.zones);

    // Process current crane state
    const craneResult = tickCrane(crane, dt, {
        grid: nextGrid,
        onNeedStoreTarget: findStorage,
    });

    nextCrane = craneResult.crane;

    // Handle crane actions
    if (craneResult.action) {
        const action = craneResult.action;
        onAction({ type: 'CRANE_ACTION', action });

        switch (action.type) {
            case 'PICKUP_FROM_IO': {
                // Generate a random item based on available types
                const itemType = context.availableItemTypes[
                    Math.floor(Math.random() * context.availableItemTypes.length)
                ] ?? 'red';
                
                const newItem: Item = {
                    id: generateId(),
                    type: itemType,
                    storedAt: context.realTime,
                };

                nextCrane = { ...nextCrane, carrying: newItem };

                // Immediately process next step - find storage target
                const targetSlot = findStorage(newItem);
                if (targetSlot) {
                    nextCrane = {
                        ...nextCrane,
                        mission: {
                            type: 'STORE',
                            targetX: targetSlot.x,
                            targetY: targetSlot.y,
                            item: newItem,
                        },
                    };
                }
                break;
            }

            case 'DROP_AT_SLOT': {
                const { slot } = action;
                const key = `${slot.x},${slot.y}`;
                
                if (nextCrane.carrying) {
                    const newSlots = new Map(nextGrid.slots);
                    newSlots.set(key, {
                        ...slot,
                        state: 'occupied',
                        item: nextCrane.carrying,
                    });
                    nextGrid = { ...nextGrid, slots: newSlots };
                    
                    onAction({
                        type: 'ITEM_STORED',
                        slotKey: key,
                        item: nextCrane.carrying,
                    });
                }
                break;
            }

            case 'PICKUP_FROM_SLOT': {
                const { slot, item } = action;
                const key = `${slot.x},${slot.y}`;
                
                const newSlots = new Map(nextGrid.slots);
                newSlots.set(key, { ...slot, state: 'empty', item: null });
                nextGrid = { ...nextGrid, slots: newSlots };

                onAction({
                    type: 'ITEM_RETRIEVED',
                    slotKey: key,
                    item,
                });
                break;
            }

            case 'DELIVER_AT_IO': {
                if (nextCrane.carrying) {
                    const item = nextCrane.carrying;
                    const matchingOrderIndex = nextOrders.findIndex(
                        o => o.status === 'pending' && o.itemType === item.type
                    );

                    if (matchingOrderIndex !== -1) {
                        nextOrders = [...nextOrders];
                        nextOrders[matchingOrderIndex] = {
                            ...nextOrders[matchingOrderIndex],
                            status: 'completed',
                            completedAt: context.realTime,
                        };
                        nextStats = {
                            ...nextStats,
                            ordersCompleted: nextStats.ordersCompleted + 1,
                        };

                        onAction({
                            type: 'ORDER_COMPLETED',
                            orderId: nextOrders[matchingOrderIndex].id,
                        });
                    }
                }
                break;
            }
        }
    }

    // 5. Process IDLE state - find new missions
    if (nextCrane.state === 'IDLE') {
        const idleResult = processIdleState(
            nextCrane,
            nextGrid,
            nextOrders,
            context
        );
        nextCrane = idleResult.crane;
    }

    return {
        crane: nextCrane,
        grid: nextGrid,
        stats: nextStats,
        orders: nextOrders,
    };
}

function processIdleState(
    crane: Crane,
    grid: Grid,
    orders: Order[],
    context: SimulationContext
): { crane: Crane } {
    // Priority 1: Retrieve (if orders pending)
    const retrievalTarget = findBestRetrieval(
        orders,
        grid,
        context.retrievalMode,
        crane
    );

    if (retrievalTarget) {
        const { slot } = retrievalTarget;
        
        // If already at the slot, start transferring
        if (crane.x === slot.x && crane.y === slot.y) {
            return {
                crane: {
                    ...crane,
                    mission: {
                        type: 'RETRIEVE',
                        targetX: slot.x,
                        targetY: slot.y,
                        item: slot.item!,
                    },
                    state: 'TRANSFERRING',
                    busyTimeRemaining: ACTION_DELAY,
                },
            };
        }

        // Move to slot
        return {
            crane: startRetrieveMission(crane, slot.x, slot.y),
        };
    }

    // Priority 2: Store (go to IO and start store mission)
    // Check if we can store (grid not full)
    const hasEmptySlot = Array.from(grid.slots.values()).some(s => s.state === 'empty');
    
    if (hasEmptySlot) {
        // If already at IO, start store mission
        if (crane.x === grid.ioPort.x && crane.y === grid.ioPort.y) {
            return {
                crane: {
                    ...crane,
                    mission: {
                        type: 'STORE',
                        targetX: grid.ioPort.x,
                        targetY: grid.ioPort.y,
                        item: { id: 'pending', type: 'red', storedAt: 0 },
                    },
                    state: 'TRANSFERRING',
                    busyTimeRemaining: ACTION_DELAY,
                },
            };
        }

        // Move to IO
        return {
            crane: startStoreMission(crane, grid),
        };
    }

    // Nothing to do - stay idle
    return { crane };
}

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Re-exports for convenience
export { findBestStorageSlot, findBestRetrieval };
export { createCrane, calculateTravelTime } from './crane';
export type { RetrievalTarget } from './retrieval';
