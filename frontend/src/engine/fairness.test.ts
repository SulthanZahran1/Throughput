import { tickGame } from './simulation';
import { INITIAL_GRID_SIZE, HEAVY_ITEM_SLOWDOWN, PLAYER_SPEED, getIOPort, XP_PER_ORDER, BASELINE_RECYCLING_XP } from '../constants/config';
import './astar'; // Register AStar
import type { Robot } from '../types/game';

function createInitialState(): any {
    const size = INITIAL_GRID_SIZE;
    return {
        player: { x: 4, y: 4, carrying: null, speedMultiplier: 1, pickupRadius: 0, moveProgress: 0, targetX: null, targetY: null, path: [] },
        grid: Array(size).fill(0).map(() => Array(size).fill({ type: 'empty' })),
        orders: [],
        items: [],
        robots: [],
        gridSize: size,
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

async function runTests() {
    console.log('🚀 Starting Integrity & Fairness Tests...\n');

    try {
        await testIOPortCentering();
        await testHeavySlowdownEnforcement();
        await testBaselineRecyclingXP();
        console.log('\n✅ All integrity tests passed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        // @ts-ignore
        if (typeof process !== 'undefined') process.exit(1);
    }
}

async function testIOPortCentering() {
    console.log('--- Test: I/O Port Centering ---');
    const port12 = getIOPort(12);
    if (port12.x !== 6 || port12.y !== 6) throw new Error(`12x12 port wrong: ${JSON.stringify(port12)}`);

    const port16 = getIOPort(16);
    if (port16.x !== 8 || port16.y !== 8) throw new Error(`16x16 port wrong: ${JSON.stringify(port16)}`);

    console.log('✅ I/O Port centering correct for multiple sizes');
}

async function testHeavySlowdownEnforcement() {
    console.log('--- Test: Heavy Slowdown Enforcement ---');
    let state = createInitialState();

    // Player at (4,4), target (6,4) -> 2 cells
    state.player.x = 4;
    state.player.y = 4;
    state.player.carrying = { id: 'item-1', type: 'red', x: 4, y: 4, status: 'carried' };
    state.player.targetX = 6;
    state.player.targetY = 4;

    // effectiveSpeed = 8 * 0.6 = 4.8 cells/sec
    // 2 cells / 4.8 = 0.4166s = 416.67ms
    const effectiveSpeed = PLAYER_SPEED * HEAVY_ITEM_SLOWDOWN;
    const expectedTime = (2 / effectiveSpeed) * 1000;

    let ticks = 0;
    const tickMs = 16.67;

    while (state.player.x < 6 && ticks < 1000) {
        state = tickGame(state, tickMs);
        ticks++;
    }

    const actualTime = ticks * tickMs;
    console.log(`Actual time to move 2 cells (Heavy): ${actualTime.toFixed(2)}ms`);
    console.log(`Expected time: ~${expectedTime.toFixed(2)}ms`);

    if (Math.abs(actualTime - expectedTime) > 100) {
        throw new Error(`Slowdown not correctly enforced. Actual: ${actualTime}ms, Expected: ${expectedTime}ms`);
    }
    console.log('✅ Heavy slowdown enforced');
}

async function testBaselineRecyclingXP() {
    console.log('--- Test: Baseline Recycling XP ---');
    let state = createInitialState();

    // XP_PER_ORDER = 30, BASELINE_RECYCLING_XP = 0.15 -> Expect 4 XP
    const expectedXP = Math.floor(XP_PER_ORDER * BASELINE_RECYCLING_XP);

    // Add an order and have player carry its item
    const item = { id: 'i1', type: 'red', x: 2, y: 2, status: 'carried' };
    state.items = [];
    state.player.carrying = item;
    state.orders = [{ id: 'o1', type: 'red', timeLeft: 100, totalTime: 1000, itemId: 'i1' }];

    // Fail the order
    state = tickGame(state, 200);

    if (state.xp !== expectedXP) {
        throw new Error(`Recycling XP mismatch. Got ${state.xp}, expected ${expectedXP}`);
    }

    if (state.player.carrying !== null) {
        throw new Error('Item should be removed from player on order failure');
    }

    console.log(`✅ Baseline Recycling awarded ${state.xp} XP on failure while carrying`);
}

runTests();

