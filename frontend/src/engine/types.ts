/**
 * Engine Types
 * 
 * Framework-agnostic types for the game engine.
 * These mirror the types in ../types/game but are kept separate
 * to ensure the engine has no React/Zustand dependencies.
 */

// === GRID ===
export type SlotState = 'empty' | 'occupied' | 'blocked';

export interface Slot {
    x: number;
    y: number;
    state: SlotState;
    item: Item | null;
    zoneId: string | null;
}

export interface Grid {
    width: number;
    height: number;
    slots: Map<string, Slot>; // Key: "x,y"
    ioPort: { x: number; y: number };
}

// === ITEMS ===
export type ItemType = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

export interface Item {
    id: string;
    type: ItemType;
    storedAt: number; // Timestamp
}

// === CRANE ===
export type CraneState = 'IDLE' | 'MOVING' | 'TRANSFERRING';

export type MissionType = 'STORE' | 'RETRIEVE';

export interface CraneMission {
    type: MissionType;
    targetX: number;
    targetY: number;
    item: Item; // The item being moved
}

export interface Crane {
    x: number;
    y: number;
    state: CraneState;
    mission: CraneMission | null;
    carrying: Item | null;
    speed: number; // Cells per second
    busyTimeRemaining: number; // Seconds until current action completes
    targetX?: number; // Target position when moving (without mission)
    targetY?: number;
}

// === ORDERS ===
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Order {
    id: string;
    itemType: ItemType;
    createdAt: number;
    deadline: number;
    status: OrderStatus;
    completedAt?: number;
}

// === ZONES ===
export interface Zone {
    id: string;
    name: string;
    color: string;
    cells: Set<string>;
    acceptedItems: ItemType[];
    priority: number;
}

// === GAME STATE ===
export type RetrievalMode = 'fifo' | 'deadline' | 'nearest';
export type CraneMode = 'single' | 'dual';

export interface ShiftStats {
    ordersCompleted: number;
    ordersFailed: number;
    totalCycleTime: number;
    totalTravelDistance: number;
}

/**
 * Core simulation state - everything needed for the engine to run a tick.
 * This is a subset of the full game state, focused on simulation-only data.
 */
export interface SimulationState {
    // Time
    shiftTime: number; // Remaining seconds
    realTime: number; // Elapsed real seconds

    // Entities
    grid: Grid;
    crane: Crane;
    orders: Order[];
    zones: Zone[];

    // Settings
    retrievalMode: RetrievalMode;
    craneMode: CraneMode;

    // Stats
    stats: ShiftStats;
}

/**
 * Extended simulation state including level-specific data needed for order generation.
 */
export interface SimulationContext extends SimulationState {
    // Level data for order generation
    shiftDuration: number;
    lastOrderTime: number;
    availableItemTypes: ItemType[];
    orderSchedule: OrderWave[];
}

// === LEVEL DATA (subset needed for engine) ===
export interface OrderWave {
    startTime: number;
    endTime: number;
    ordersPerMinute: number;
    itemDistribution: { type: ItemType; weight: number }[];
    timerRange: { min: number; max: number };
}
