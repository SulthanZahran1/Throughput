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

export interface GameState {
    // Level
    levelId: string;

    // Time
    shiftTime: number; // Remaining seconds
    realTime: number; // Elapsed real seconds
    isPaused: boolean;

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
