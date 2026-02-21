/**
 * Crane Engine
 * 
 * Pure functions for crane movement, actions, and state transitions.
 * No React/Zustand dependencies.
 */

import type { Crane, Grid, Item, Slot, MissionType } from './types';

// Constants
const DEFAULT_CRANE_SPEED = 3; // Cells per second
const ACTION_DELAY = 0.5; // Seconds for pickup/drop

export interface CraneTickResult {
    crane: Crane;
    action?: CraneAction;
}

export type CraneAction =
    | { type: 'PICKUP_FROM_IO'; item: Item }
    | { type: 'DROP_AT_SLOT'; slot: Slot }
    | { type: 'PICKUP_FROM_SLOT'; slot: Slot; item: Item }
    | { type: 'DELIVER_AT_IO'; orderId: string }
    | { type: 'ARRIVED'; x: number; y: number };

export interface MoveOptions {
    targetX: number;
    targetY: number;
    missionType?: MissionType;
}

/**
 * Calculate travel time between two points.
 */
export function calculateTravelTime(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    speed: number = DEFAULT_CRANE_SPEED
): number {
    const dist = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
    return dist / speed;
}

/**
 * Create a crane in IDLE state at a position.
 */
export function createCrane(x: number, y: number): Crane {
    return {
        x,
        y,
        state: 'IDLE',
        mission: null,
        carrying: null,
        speed: DEFAULT_CRANE_SPEED,
        busyTimeRemaining: 0,
        targetX: undefined,
        targetY: undefined,
    };
}

/**
 * Start moving the crane to a target position.
 */
export function moveCrane(
    crane: Crane,
    options: MoveOptions
): Crane {
    const { targetX, targetY } = options;
    const duration = calculateTravelTime(crane.x, crane.y, targetX, targetY, crane.speed);

    return {
        ...crane,
        x: crane.x, // Keep current position until arrival
        y: crane.y,
        state: 'MOVING',
        busyTimeRemaining: duration,
        targetX,
        targetY,
        mission: options.missionType ? {
            type: options.missionType,
            targetX,
            targetY,
            item: crane.carrying ?? { id: 'pending', type: 'red', storedAt: 0 },
        } : null,
    };
}

/**
 * Process one tick of crane state machine.
 * Returns the new crane state and any action that occurred.
 */
export function tickCrane(
    crane: Crane,
    dt: number,
    context: {
        grid: Grid;
        onNeedStoreTarget: (item: Item) => Slot | null;
    }
): CraneTickResult {
    // Process busy time (MOVING or TRANSFERRING)
    if (crane.busyTimeRemaining > 0) {
        const newBusyTime = Math.max(0, crane.busyTimeRemaining - dt);
        
        if (newBusyTime > 0) {
            // Still busy
            return {
                crane: { ...crane, busyTimeRemaining: newBusyTime },
            };
        }

        // Action just completed
        return completeCurrentAction(crane, context);
    }

    // IDLE - no action needed
    return { crane };
}

function completeCurrentAction(
    crane: Crane,
    context: { grid: Grid; onNeedStoreTarget: (item: Item) => Slot | null }
): CraneTickResult {
    if (crane.state === 'MOVING') {
        // Arrived at destination - use target from mission or stored targetX/Y
        const targetX = crane.mission?.targetX ?? crane.targetX ?? crane.x;
        const targetY = crane.mission?.targetY ?? crane.targetY ?? crane.y;

        return {
            crane: {
                ...crane,
                x: targetX,
                y: targetY,
                targetX: undefined,
                targetY: undefined,
                state: 'TRANSFERRING',
                busyTimeRemaining: ACTION_DELAY,
            },
            action: { type: 'ARRIVED', x: targetX, y: targetY },
        };
    }

    if (crane.state === 'TRANSFERRING') {
        return completeTransfer(crane, context);
    }

    return { crane };
}

function completeTransfer(
    crane: Crane,
    context: { grid: Grid; onNeedStoreTarget: (item: Item) => Slot | null }
): CraneTickResult {
    const { grid, onNeedStoreTarget } = context;
    const mission = crane.mission;
    const atIO = crane.x === grid.ioPort.x && crane.y === grid.ioPort.y;

    // STORE mission
    if (mission?.type === 'STORE') {
        return completeStoreMission(crane, grid, onNeedStoreTarget, atIO);
    }

    // RETRIEVE mission
    if (mission?.type === 'RETRIEVE') {
        return completeRetrieveMission(crane, grid, atIO);
    }

    // Unknown mission - go idle
    return {
        crane: {
            ...crane,
            state: 'IDLE',
            busyTimeRemaining: 0,
            mission: null,
        },
    };
}

function completeStoreMission(
    crane: Crane,
    grid: Grid,
    onNeedStoreTarget: (item: Item) => Slot | null,
    atIO: boolean
): CraneTickResult {
    // At IO without item -> Pickup from IO
    if (atIO && !crane.carrying) {
        // Item will be provided by simulation layer
        return {
            crane: {
                ...crane,
                state: 'TRANSFERRING', // Stay in transferring, waiting for item
                busyTimeRemaining: 0, // Signal that we need item
            },
            action: { type: 'PICKUP_FROM_IO', item: null! }, // Item filled by simulation
        };
    }

    // At target slot with item -> Drop
    const targetX = crane.mission?.targetX ?? crane.x;
    const targetY = crane.mission?.targetY ?? crane.y;
    const atTarget = crane.x === targetX && crane.y === targetY;
    const key = `${crane.x},${crane.y}`;
    const slot = grid.slots.get(key);

    if (atTarget && crane.carrying && slot?.state === 'empty') {
        return {
            crane: {
                ...crane,
                carrying: null,
                state: 'IDLE',
                mission: null,
                busyTimeRemaining: 0,
            },
            action: {
                type: 'DROP_AT_SLOT',
                slot,
            },
        };
    }

    // At IO with item -> Need to find storage slot and move there
    if (atIO && crane.carrying) {
        const targetSlot = onNeedStoreTarget(crane.carrying);
        
        if (targetSlot) {
            const duration = calculateTravelTime(
                crane.x, crane.y, targetSlot.x, targetSlot.y, crane.speed
            );
            
            return {
                crane: {
                    ...crane,
                    mission: {
                        type: 'STORE',
                        targetX: targetSlot.x,
                        targetY: targetSlot.y,
                        item: crane.carrying,
                    },
                    state: 'MOVING',
                    busyTimeRemaining: duration,
                },
            };
        }

        // No slot found - stuck holding item, go idle
        return {
            crane: {
                ...crane,
                state: 'IDLE',
                mission: null,
            },
        };
    }

    // Unexpected state
    return {
        crane: {
            ...crane,
            state: 'IDLE',
            mission: null,
        },
    };
}

function completeRetrieveMission(
    crane: Crane,
    grid: Grid,
    atIO: boolean
): CraneTickResult {
    // At IO with item -> Deliver
    if (atIO && crane.carrying) {
        return {
            crane: {
                ...crane,
                carrying: null,
                state: 'IDLE',
                mission: null,
            },
            action: {
                type: 'DELIVER_AT_IO',
                orderId: '', // Filled by simulation layer
            },
        };
    }

    // At slot without item -> Pickup
    const key = `${crane.x},${crane.y}`;
    const slot = grid.slots.get(key);

    if (slot?.state === 'occupied' && slot.item && !crane.carrying) {
        // Move to IO
        const duration = calculateTravelTime(
            crane.x, crane.y, grid.ioPort.x, grid.ioPort.y, crane.speed
        );

        return {
            crane: {
                ...crane,
                carrying: slot.item,
                mission: {
                    type: 'RETRIEVE',
                    targetX: grid.ioPort.x,
                    targetY: grid.ioPort.y,
                    item: slot.item,
                },
                state: 'MOVING',
                busyTimeRemaining: duration,
            },
            action: {
                type: 'PICKUP_FROM_SLOT',
                slot,
                item: slot.item,
            },
        };
    }

    // Unexpected state
    return {
        crane: {
            ...crane,
            state: 'IDLE',
            mission: null,
        },
    };
}

/**
 * Start a STORE mission from the IO port.
 */
export function startStoreMission(crane: Crane, grid: Grid): Crane {
    const duration = calculateTravelTime(
        crane.x, crane.y, grid.ioPort.x, grid.ioPort.y, crane.speed
    );

    return {
        ...crane,
        mission: {
            type: 'STORE',
            targetX: grid.ioPort.x,
            targetY: grid.ioPort.y,
            item: { id: 'pending', type: 'red', storedAt: 0 },
        },
        state: duration === 0 ? 'TRANSFERRING' : 'MOVING',
        busyTimeRemaining: duration === 0 ? ACTION_DELAY : duration,
    };
}

/**
 * Start a RETRIEVE mission to a specific slot.
 */
export function startRetrieveMission(
    crane: Crane,
    targetX: number,
    targetY: number
): Crane {
    const duration = calculateTravelTime(crane.x, crane.y, targetX, targetY, crane.speed);

    return {
        ...crane,
        mission: {
            type: 'RETRIEVE',
            targetX,
            targetY,
            item: { id: 'pending', type: 'red', storedAt: 0 },
        },
        state: duration === 0 ? 'TRANSFERRING' : 'MOVING',
        busyTimeRemaining: duration === 0 ? ACTION_DELAY : duration,
    };
}
