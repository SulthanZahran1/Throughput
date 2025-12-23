export const GRID_SIZE = 16;
export const TICK_RATE = 1000 / 60; // 60 FPS

// ==========================================
// TESTING CONFIG - Adjust these for testing
// ==========================================
export const ORDER_SPAWN_RATE = 5000; // ms between orders (lower = faster spawning)
export const ORDER_TIMEOUT = 60000;   // ms to fulfill order (lower = harder)
export const ROBOT_SPEED = 4;         // cells per second (lower = slower)
// ==========================================

export const PLAYER_SPEED = 4; // Grid cells per second (approx)

export const IO_PORT = { x: 0, y: 8 }; // Middle of left wall

// Phase 2: Progression
export const XP_PER_ORDER = 25;
export const XP_PER_LEVEL = 100; // Harder progression

// Phase 2: Robot Collision
export const ROBOT_COLLISION_DISTANCE = 1.5; // Cells
export const ROBOT_COLLISION_SLOWDOWN = 0.7; // Speed multiplier when colliding
export const ROBOT_BLOCKED_THRESHOLD = 10;   // Ticks to wait before rerouting

// Phase 2: Upgrade Values
export const UPGRADE_FASTER_ROBOTS_BONUS = 0.25; // +25% speed
export const UPGRADE_SPEED_BOOTS_BONUS = 0.30; // +30% speed
export const UPGRADE_LONGER_ARMS_RADIUS = 1; // +1 pickup radius
export const UPGRADE_ORDER_EXTENSION_TIME = 5000; // +5s per order

// New Upgrade Values
export const CONVEYOR_SPEED = 1; // Cells per second items drift toward I/O
export const MULTI_CARRY_CAPACITY = 2; // Items per robot with upgrade
export const DOUBLE_XP_MULTIPLIER = 2; // XP multiplier per stack
export const URGENT_ORDER_THRESHOLD = 10000; // 10 seconds for radar highlight

// Phase 3: Scaling & Win Condition
export const TARGET_RUN_TIME = 900000; // 15 minutes in ms (win condition)
export const INITIAL_ORDER_SPAWN_RATE = 5000; // 5s between orders at start
export const MIN_ORDER_SPAWN_RATE = 800; // 0.8s at max pressure (late game)
export const ORDER_RATE_RAMP_DURATION = 600000; // 10 min to reach max rate

// ==========================================
// ITEM TRAITS & PRODUCTS
// ==========================================
export const HEAVY_ITEM_SLOWDOWN = 0.6; // -40% speed
export const FRAGILE_ITEM_DECAY_MULTIPLIER = 2.0; // 2x faster decay
export const HAZARDOUS_ITEM_RADIUS = 2.0; // Cells
export const HAZARDOUS_ITEM_SLOWDOWN = 0.7; // -30% speed

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

/**
 * Calculate dynamic order spawn rate based on run time.
 * Ramps from INITIAL_ORDER_SPAWN_RATE → MIN_ORDER_SPAWN_RATE over ORDER_RATE_RAMP_DURATION.
 */
export const getOrderSpawnRate = (runTime: number): number => {
    const progress = Math.min(runTime / ORDER_RATE_RAMP_DURATION, 1);
    const rate = INITIAL_ORDER_SPAWN_RATE -
        (INITIAL_ORDER_SPAWN_RATE - MIN_ORDER_SPAWN_RATE) * progress;
    return Math.max(MIN_ORDER_SPAWN_RATE, rate);
};
