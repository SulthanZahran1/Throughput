export const TICK_RATE = 1000 / 60; // 60 FPS

// ==========================================
// ROGUELIKE CONFIG
// ==========================================
export const INITIAL_GRID_SIZE = 12;
export const MAX_GRID_SIZE = 20;
export const MAP_SCALE_INTERVAL = 180000; // 3 minutes

export const ORDER_TIMEOUT = 45000;   // 45s (was 60s)
export const ROBOT_SPEED = 4;         // cells per second

export const PLAYER_SPEED = 8; // Grid cells per second

/**
 * Calculate I/O Port position (Center of grid)
 */
export const getIOPort = (gridSize: number) => ({
    x: Math.floor(gridSize / 2),
    y: Math.floor(gridSize / 2)
});

// Phase 2: Progression
export const XP_PER_ORDER = 30; // (was 25)
export const XP_PER_LEVEL = 100;

// Anti-Death-Spiral
export const ORDER_THROTTLE_THRESHOLD = 4;
export const BASELINE_RECYCLING_XP = 0.15; // 15% XP on failure

// Phase 2: Robot Collision
export const ROBOT_COLLISION_DISTANCE = 1.5;
export const ROBOT_COLLISION_SLOWDOWN = 0.7;
export const ROBOT_BLOCKED_THRESHOLD = 10;

// Phase 2: Upgrade Values
export const UPGRADE_FASTER_ROBOTS_BONUS = 0.35; // (was 25%)
export const UPGRADE_SPEED_BOOTS_BONUS = 0.40; // (was 30%)
export const UPGRADE_LONGER_ARMS_RADIUS = 1;
export const UPGRADE_ORDER_EXTENSION_TIME = 5000;

// New Upgrade Values
export const CONVEYOR_SPEED = 1;
export const MULTI_CARRY_CAPACITY = 2;
export const DOUBLE_XP_MULTIPLIER = 2;
export const URGENT_ORDER_THRESHOLD = 10000;

// Phase 3: Scaling & Win Condition
export const TARGET_RUN_TIME = 900000; // 15 minutes
export const INITIAL_ORDER_SPAWN_RATE = 4000; // 4s (was 5s)
export const MIN_ORDER_SPAWN_RATE = 800;
export const ORDER_RATE_RAMP_DURATION = 600000; // 10 min

// Surge Events: Rush Hour
export const RUSH_HOUR_INTERVAL = 180000;
export const RUSH_HOUR_DURATION = 30000;
export const RUSH_HOUR_SPAWN_MULTIPLIER = 2.0;
export const RUSH_HOUR_XP_MULTIPLIER = 3.0;

export const isRushHour = (runTime: number): boolean => {
    if (runTime < RUSH_HOUR_INTERVAL) return false;
    const cycle = runTime % RUSH_HOUR_INTERVAL;
    return cycle < RUSH_HOUR_DURATION;
};

// ==========================================
// ITEM TRAITS & PRODUCTS
// ==========================================
export const HEAVY_ITEM_SLOWDOWN = 0.6;
export const FRAGILE_ITEM_DECAY_MULTIPLIER = 2.0;
export const HAZARDOUS_ITEM_RADIUS = 2.0;
export const HAZARDOUS_ITEM_SLOWDOWN = 0.7;

export interface ProductDefinition {
    name: string;
    icon: string;
    color: string;
    gradient: string;
    trait: 'heavy' | 'fragile' | 'hazardous' | 'none';
    description: string;
}

export const PRODUCT_DEFINITIONS: Record<string, ProductDefinition> = {
    red: {
        name: 'Industrial',
        icon: 'Package',
        color: '#ef4444',
        gradient: 'from-red-500 to-red-700',
        trait: 'heavy',
        description: 'Heavy: Slows down the carrier by 40%.',
    },
    blue: {
        name: 'Electronics',
        icon: 'Cpu',
        color: '#3b82f6',
        gradient: 'from-blue-500 to-blue-700',
        trait: 'fragile',
        description: 'Fragile: Timer decays 2x faster on the ground.',
    },
    green: {
        name: 'Biohazard',
        icon: 'Biohazard',
        color: '#22c55e',
        gradient: 'from-green-500 to-green-700',
        trait: 'hazardous',
        description: 'Hazardous: Slows nearby entities by 30%.',
    },
};

export const getOrderSpawnRate = (runTime: number): number => {
    const progress = Math.min(runTime / ORDER_RATE_RAMP_DURATION, 1);
    const rate = INITIAL_ORDER_SPAWN_RATE -
        (INITIAL_ORDER_SPAWN_RATE - MIN_ORDER_SPAWN_RATE) * progress;
    return Math.max(MIN_ORDER_SPAWN_RATE, rate);
};

