import type { ItemType } from './game';

export interface OrderWave {
    startTime: number; // Seconds into shift
    endTime: number;
    ordersPerMinute: number;
    itemDistribution: { type: ItemType; weight: number }[];
    timerRange: { min: number; max: number }; // Seconds to fulfill
}

export interface StarThreshold {
    metric: string;
    value: number;
}

export interface LevelDefinition {
    id: string;
    name: string;
    description: string;
    act: number;

    // Grid
    gridWidth: number;
    gridHeight: number;
    ioPortPosition: { x: number; y: number };
    blockedCells: { x: number; y: number }[];

    // Items
    itemTypes: ItemType[];
    initialInventory: { type: ItemType; slot: { x: number; y: number } }[];

    // Orders
    shiftDuration: number; // seconds (real-time)
    orderSchedule: OrderWave[];

    // Win conditions
    survivalThreshold: number; // Max failed orders
    starThresholds: {
        one: StarThreshold;
        two: StarThreshold;
        three: StarThreshold;
    };

    // Unlocks
    unlocksFeature?: string;
    requiresStars: number;
}
