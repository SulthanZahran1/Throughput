import { tickGame } from './simulation';
import { GRID_SIZE, HEAVY_ITEM_SLOWDOWN, PLAYER_SPEED } from '../constants/config';

function createInitialState(): any {
    return {
        player: { x: 8, y: 8, carrying: null, speedMultiplier: 1, pickupRadius: 0, moveProgress: 0, targetX: null, targetY: null, path: [] },
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

async function runTests() {
    console.log('🚀 Starting Fairness Tests...\n');

    try {
        await testHeavySlowdownEnforcement();
        console.log('\n✅ All fairness tests passed!');
    } catch (error) {
        console.error('\n❌ Fairness test failed:', error);
        process.exit(1);
    }
}

async function testHeavySlowdownEnforcement() {
    console.log('--- Test: Heavy Slowdown Enforcement ---');
    let state = createInitialState();

    // Player carrying heavy item
    state.player.carrying = { id: 'item-1', type: 'red', x: 8, y: 8, status: 'carried' };
    state.player.targetX = 10;
    state.player.targetY = 8;

    // Calculate expected time to move 2 cells
    // Speed = PLAYER_SPEED * HEAVY_ITEM_SLOWDOWN
    const effectiveSpeed = PLAYER_SPEED * HEAVY_ITEM_SLOWDOWN;
    const timeToMoveOneCell = 1000 / effectiveSpeed;
    const expectedTime = timeToMoveOneCell * 2;

    let ticks = 0;
    const tickMs = 16.67; // 60fps

    while (state.player.x < 10 && ticks < 200) {
        state = tickGame(state, tickMs);
        ticks++;
    }

    const actualTime = ticks * tickMs;
    console.log(`Actual time to move 2 cells (Heavy): ${actualTime.toFixed(2)}ms`);
    console.log(`Expected time: ~${expectedTime.toFixed(2)}ms`);

    if (Math.abs(actualTime - expectedTime) > 100) {
        throw new Error(`Slowdown not correctly enforced. Actual: ${actualTime}ms, Expected: ${expectedTime}ms`);
    }
}

runTests();
