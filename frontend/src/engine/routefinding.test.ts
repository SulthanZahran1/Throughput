import type { Robot } from '../types/game';
import { tickGame } from './simulation';
import { GRID_SIZE } from '../constants/config';
import process from 'process';

// Mock types/constants if needed or import directly if they are pure
// Since they are already pure TS, we can just import them.

async function runTests() {
    console.log('🚀 Starting Route-finding Tests...\n');

    try {
        await testOppositeCommands();
        await testItemAvoidance();
        await testPlayerCollision();
        await testIOPortBlockage();
        await testDynamicItemDrift();
        await testTotalBlockage();

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Helper to create a basic state
function createInitialState(): any {
    return {
        player: { x: 8, y: 8, carrying: null, speedMultiplier: 1, pickupRadius: 1, moveProgress: 0, targetX: null, targetY: null, path: [] },
        grid: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill({ type: 'empty' })),
        orders: [],
        items: [],
        robots: [],
        xp: 0,
        level: 1,
        upgrades: [],
        runTime: 0,
        failedOrders: 0,
        isGameOver: false,
        hasWon: false,
        isSelectingUpgrade: false,
        pendingUpgrades: [],
        ordersCompleted: 0
    };
}

async function testOppositeCommands() {
    console.log('--- Scenario 1: Opposite Commands (Deadlock) ---');
    let state = createInitialState();

    // Robots at y=0 (top edge) so they can only move horizontally or down.
    // Robot A at (5,0) wants (7,0)
    // Robot B at (7,0) wants (5,0)
    const robotA: Robot = {
        id: 'robot-A', x: 5, y: 0, state: 'moving_to_item', target: { x: 7, y: 0 },
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['order-1'], speedMultiplier: 1
    };
    const robotB: Robot = {
        id: 'robot-B', x: 7, y: 0, state: 'moving_to_item', target: { x: 5, y: 0 },
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['order-2'], speedMultiplier: 1
    };

    state.robots = [robotA, robotB];
    state.orders = [
        { id: 'order-1', type: 'red', timeLeft: 100000, itemId: 'item-1', claimedBy: 'robot-A' },
        { id: 'order-2', type: 'blue', timeLeft: 100000, itemId: 'item-2', claimedBy: 'robot-B' }
    ];
    state.items = [
        { id: 'item-1', x: 7, y: 0, type: 'red', status: 'on_ground' },
        { id: 'item-2', x: 5, y: 0, type: 'blue', status: 'on_ground' }
    ];

    // Simulate
    let robotAReached = false;
    let robotBReached = false;

    for (let i = 0; i < 200; i++) {
        state = tickGame(state, 100);

        if (state.robots[0].state === 'picking' || state.robots[0].state === 'moving_to_port' || state.robots[0].state === 'dropping') {
            robotAReached = true;
        }
        if (state.robots[1].state === 'picking' || state.robots[1].state === 'moving_to_port' || state.robots[1].state === 'dropping') {
            robotBReached = true;
        }

        if (robotAReached && robotBReached) {
            console.log(`✅ Robots swapped positions (reached targets) in ${i} ticks.`);
            return;
        }
    }

    throw new Error(`Robots failed to swap. A reached: ${robotAReached}, B reached: ${robotBReached}`);
}

async function testItemAvoidance() {
    console.log('--- Scenario 2: Item Avoidance ---');
    let state = createInitialState();

    // Robot at (0,0) going to (10,0)
    // Item at (5,0)
    state.robots = [{
        id: 'robot-1', x: 0, y: 0, state: 'moving_to_item', target: { x: 10, y: 0 },
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['order-1'], speedMultiplier: 1
    }];
    state.orders = [{ id: 'order-1', type: 'red', timeLeft: 100000, itemId: 'item-1', claimedBy: 'robot-1' }];
    state.items = [
        { id: 'item-1', x: 10, y: 0, type: 'red', status: 'on_ground' },
        { id: 'item-extra', x: 5, y: 0, type: 'blue', status: 'on_ground' } // Obstacle item
    ];

    // Tick once to trigger pathfinding
    state = tickGame(state, 100);
    const path = state.robots[0].path;

    if (!path) throw new Error('Robot failed to find path');

    // If it avoids the item, it shouldn't have (5,0) in its path
    const passesThroughItem = path.some((p: any) => p.x === 5 && p.y === 0);
    if (passesThroughItem) {
        throw new Error('Robot path passes through item at (5,0)');
    }

    console.log('✅ Robot avoids item on ground');
}

async function testPlayerCollision() {
    console.log('--- Scenario 3: Player vs Robot ---');
    let state = createInitialState();

    // Player at (0,8) target (5,8)
    // Robot at (2,8) (stationary/idle)
    state.player = { ...state.player, x: 0, y: 8, targetX: 5, targetY: 8 };
    state.robots = [{
        id: 'robot-1', x: 2, y: 8, state: 'idle', target: null,
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: [], speedMultiplier: 1
    }];

    // Simulate for 5 seconds
    for (let i = 0; i < 50; i++) {
        state = tickGame(state, 100);
        if (state.player.x === 5 && state.player.y === 8) {
            console.log(`✅ Player reached target in ${i} ticks.`);
            return;
        }
    }

    console.log(`❌ Player stuck at (${state.player.x}, ${state.player.y}). Robot at (2, 8)`);
    throw new Error('Player movement halted by robot even if path exists around');
}

async function testIOPortBlockage() {
    console.log('--- Scenario 4: I/O Port Blockage ---');
    let state = createInitialState();

    // 2 robots at (2,8), (3,8) all carrying items, going to (0,8)
    const robots: Robot[] = [
        { id: 'robot-1', x: 2, y: 8, state: 'moving_to_port', target: { x: 0, y: 8 }, carryingItems: [{ id: 'i1', type: 'red', status: 'carried' } as any], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['o1'], targetOrderId: 'o1', speedMultiplier: 1 },
        { id: 'robot-2', x: 3, y: 8, state: 'moving_to_port', target: { x: 0, y: 8 }, carryingItems: [{ id: 'i2', type: 'blue', status: 'carried' } as any], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['o2'], targetOrderId: 'o2', speedMultiplier: 1 }
    ];
    state.robots = robots;
    state.orders = [
        { id: 'o1', type: 'red', timeLeft: 100000, itemId: 'i1' },
        { id: 'o2', type: 'blue', timeLeft: 100000, itemId: 'i2' }
    ];

    // Simulate
    for (let i = 0; i < 150; i++) {
        state = tickGame(state, 100);

        if (!state.orders.some((o: any) => o.id === 'o1' || o.id === 'o2')) {
            console.log(`✅ Both specific orders finished at I/O Port in ${i} ticks.`);
            return;
        }
    }

    throw new Error(`Robots stuck at I/O Port. Remaining orders: ${state.orders.length}`);
}

async function testDynamicItemDrift() {
    console.log('--- Scenario 5: Dynamic Item Drift ---');
    let state = createInitialState();

    // Robot moving to item-1 at (5,5)
    state.robots = [{
        id: 'robot-1', x: 0, y: 0, state: 'moving_to_item', target: { x: 5, y: 5 },
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['o1'], targetOrderId: 'o1', speedMultiplier: 1
    }];
    state.orders = [{ id: 'o1', type: 'red', timeLeft: 100000, itemId: 'i1' }];
    state.items = [{ id: 'i1', x: 5, y: 5, type: 'red', status: 'on_ground' }];

    // Tick once to find path
    state = tickGame(state, 100);
    // console.log(`Initial robot target: (${state.robots[0].target?.x}, ${state.robots[0].target?.y})`);

    // Move item!
    state.items[0].x = 7;
    state.items[0].y = 5;

    // Tick again. Robot should detect drift in updateRobotState and update its target
    state = tickGame(state, 100);

    if (state.robots[0].target?.x === 7) {
        console.log(`✅ Robot updated target to drifted item at (${state.robots[0].target.x}, ${state.robots[0].target.y})`);
    } else {
        throw new Error(`Robot failed to update target for drifted item. Still at (${state.robots[0].target?.x}, ${state.robots[0].target?.y})`);
    }
}

async function testTotalBlockage() {
    console.log('--- Scenario 6: Total Blockage ---');
    let state = createInitialState();

    // Robot wants to go to (5,5)
    state.robots = [{
        id: 'robot-1', x: 0, y: 0, state: 'moving_to_item', target: { x: 5, y: 5 },
        carryingItems: [], moveProgress: 0, blockedTicks: 0, targetOrderIds: ['o1'], targetOrderId: 'o1', speedMultiplier: 1
    }];
    state.orders = [{ id: 'o1', type: 'red', timeLeft: 100000, itemId: 'i1' }];
    state.items = [{ id: 'i1', x: 5, y: 5, type: 'red', status: 'on_ground' }];

    // Player blocks (5,5)
    state.player.x = 5;
    state.player.y = 5;

    // Simulate for a few ticks. Robot should try to path, reach the player, and get blocked.
    for (let i = 0; i < 60; i++) {
        state = tickGame(state, 100);
        // if (i % 10 === 0) console.log(`Tick ${i}: Robot at (${state.robots[0].x}, ${state.robots[0].y}) Path: ${JSON.stringify(state.robots[0].path)}`);
    }

    if (state.robots[0].blockedTicks > 0 || state.robots[0].path.length === 0) {
        console.log(`✅ Robot detected blockage. BlockedTicks: ${state.robots[0].blockedTicks}, Path cleared: ${state.robots[0].path.length === 0}`);
    } else {
        console.log(`Final Position: (${state.robots[0].x}, ${state.robots[0].y})`);
        console.log(`Blocked Ticks: ${state.robots[0].blockedTicks}`);
        throw new Error('Robot failed to detect blockage by player');
    }
}

runTests();
