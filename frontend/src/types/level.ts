import type { ItemType } from './game';

// === LEVEL STRUCTURE ===

export interface OrderWave {
    startTime: number; // Seconds into shift when wave begins
    endTime: number; // Seconds into shift when wave ends
    ordersPerMinute: number;
    itemDistribution: { type: ItemType; weight: number }[];
    timerRange: { min: number; max: number }; // Seconds to fulfill
}

export interface StarThreshold {
    metric: 'survival' | 'jph' | 'cycle_time' | 'orders_completed';
    value: number;
}

export interface InitialItem {
    type: ItemType;
    slot: { x: number; y: number };
}

export interface LevelDefinition {
    id: string;
    name: string;
    description: string;
    act: number; // 1 = Tutorial, 2 = Automation, etc.

    // Grid configuration
    gridWidth: number;
    gridHeight: number;
    ioPortPosition: { x: number; y: number };
    blockedCells?: { x: number; y: number }[];

    // Items
    itemTypes: ItemType[];
    initialInventory?: InitialItem[];

    // Orders & timing
    shiftDuration: number; // Seconds (real-time)
    orderSchedule: OrderWave[];

    // Win conditions
    survivalThreshold: number; // Max failed orders before game over
    starThresholds: {
        one: StarThreshold;
        two: StarThreshold;
        three: StarThreshold;
    };

    // Feature configuration
    unlockedFeatures?: string[]; // Features available in this level
    unlocksFeature?: string; // Feature unlocked upon completion
    requiresStars?: number; // Stars needed to attempt this level
}

// === PROGRESS TRACKING ===

export interface LevelProgress {
    levelId: string;
    stars: number; // 0-3
    bestJph: number;
    bestCycleTime: number;
    attempts: number;
    completedAt?: number;
}

export interface UserProgress {
    completedLevels: Record<string, LevelProgress>;
    unlockedFeatures: string[];
    currentLevel: string | null;
    totalStars: number;
}

// === SHIFT RESULT ===

export interface ShiftResult {
    levelId: string;
    outcome: 'win' | 'lose';
    ordersCompleted: number;
    ordersFailed: number;
    avgCycleTime: number;
    jph: number;
    duration: number;
    starsEarned: number;
    newUnlock?: string;
}

// === FEATURE FLAGS ===

export const FEATURE_FLAGS = {
    ZONES: 'zones',
    DUAL_COMMAND: 'dual_command',
    RETRIEVAL_MODES: 'retrieval_modes',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
