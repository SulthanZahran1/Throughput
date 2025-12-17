export const GRID_SIZE = 16;
export const TICK_RATE = 1000 / 60; // 60 FPS

// ==========================================
// TESTING CONFIG - Adjust these for testing
// ==========================================
export let ORDER_SPAWN_RATE = 5000; // ms between orders (lower = faster spawning)
export let ORDER_TIMEOUT = 30000;   // ms to fulfill order (lower = harder)
export let ROBOT_SPEED = 3;         // cells per second (lower = slower)
// ==========================================

export const PLAYER_SPEED = 10; // Grid cells per second (approx)

export const IO_PORT = { x: 0, y: 8 }; // Middle of left wall

// Phase 2: Progression
export const XP_PER_ORDER = 25;
export const XP_PER_LEVEL = 200; // Harder progression

// Phase 2: Robot Collision
export const ROBOT_COLLISION_DISTANCE = 1.5; // Cells
export const ROBOT_COLLISION_SLOWDOWN = 0.7; // Speed multiplier when colliding

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
