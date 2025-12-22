import type { GameState, Player, Robot } from '../types/game';
import { updateOrders, spawnOrderWithItem } from './orders';
import { updateRobots } from './robots';
import {
    XP_PER_ORDER,
    XP_PER_LEVEL,
    TARGET_RUN_TIME,
    IO_PORT,
    getOrderSpawnRate,
    GRID_SIZE,
    PLAYER_SPEED,
} from '../constants/config';
import { getRandomUpgrades, getOrderTimeExtension, getConveyorSpeed, getXpMultiplier } from './upgrades';
import { tryPickupItem, findSmarterMove } from './player';

/**
 * Check if player should level up and trigger upgrade selection
 */
const checkLevelUp = (state: GameState): GameState => {
    const xpNeeded = state.level * XP_PER_LEVEL;

    if (state.xp >= xpNeeded && !state.isSelectingUpgrade) {
        // Level up! Offer upgrade choices
        const pendingUpgrades = getRandomUpgrades(3, state.upgrades);

        return {
            ...state,
            level: state.level + 1,
            xp: state.xp - xpNeeded,
            isSelectingUpgrade: true,
            pendingUpgrades,
        };
    }

    return state;
};

/**
 * Move player toward target position (tap-to-move) - grid-aligned
 * Player moves one cell at a time, rate-limited by PLAYER_SPEED
 */
const updatePlayerMovement = (
    player: Player,
    delta: number,
    items: GameState['items'],
    grid: GameState['grid'],
    orders: GameState['orders'],
    upgrades: GameState['upgrades'],
    robots: Robot[]
): { player: Player; items: GameState['items']; orders: GameState['orders']; xpGain: number; ordersCompleted: number } => {
    if (player.targetX === null || player.targetY === null) {
        return { player, items, orders, xpGain: 0, ordersCompleted: 0 };
    }

    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;

    // Check if we've reached the target
    if (dx === 0 && dy === 0) {
        return {
            player: { ...player, targetX: null, targetY: null, moveProgress: 0 },
            items,
            orders,
            xpGain: 0,
            ordersCompleted: 0,
        };
    }

    // Calculate how much progress we make this tick
    // PLAYER_SPEED is in cells per second
    const effectiveSpeed = PLAYER_SPEED * player.speedMultiplier;
    const progressThisTick = effectiveSpeed * (delta / 1000);
    const newProgress = player.moveProgress + progressThisTick;

    // If we haven't accumulated enough progress to move a cell, wait
    if (newProgress < 1) {
        return {
            player: { ...player, moveProgress: newProgress },
            items,
            orders,
            xpGain: 0,
            ordersCompleted: 0
        };
    }

    // We can move! Calculate new position
    const remainingProgress = newProgress - 1;

    const { x: newX, y: newY } = findSmarterMove(
        { x: player.x, y: player.y },
        { x: player.targetX, y: player.targetY },
        robots
    );

    // If we couldn't move at all (blocked in all directions)
    if (newX === player.x && newY === player.y) {
        return {
            player: { ...player, moveProgress: 0.5 },
            items,
            orders,
            xpGain: 0,
            ordersCompleted: 0
        };
    }

    // Clear target if we've arrived
    const arrivedAtTarget = newX === player.targetX && newY === player.targetY;
    let updatedPlayer = {
        ...player,
        x: newX,
        y: newY,
        targetX: arrivedAtTarget ? null : player.targetX,
        targetY: arrivedAtTarget ? null : player.targetY,
        moveProgress: arrivedAtTarget ? 0 : remainingProgress,
    };
    let updatedItems = items;
    let updatedOrders = orders;
    let xpGain = 0;
    let ordersCompletedCount = 0;

    // Try to pick up item at new location
    const pickupResult = tryPickupItem(updatedPlayer, grid, updatedItems);
    if (pickupResult) {
        updatedPlayer = pickupResult.player;
        updatedItems = pickupResult.items;
    }

    // Check if player is at I/O port with an item (deliver)
    if (updatedPlayer.carrying &&
        updatedPlayer.x === IO_PORT.x &&
        updatedPlayer.y === IO_PORT.y) {

        const carriedType = updatedPlayer.carrying.type;
        const matchingOrder = updatedOrders.find(o => o.type === carriedType);

        if (matchingOrder) {
            const xpMultiplier = getXpMultiplier(upgrades);
            xpGain = Math.floor(XP_PER_ORDER * xpMultiplier);
            updatedPlayer = { ...updatedPlayer, carrying: null };
            updatedOrders = updatedOrders.filter(o => o.id !== matchingOrder.id);
            ordersCompletedCount = 1;
        } else {
            updatedPlayer = { ...updatedPlayer, carrying: null };
        }
    }

    return { player: updatedPlayer, items: updatedItems, orders: updatedOrders, xpGain, ordersCompleted: ordersCompletedCount };
};

export const tickGame = (state: GameState, delta: number): GameState => {
    // Don't tick while selecting upgrade or game over
    if (state.isGameOver || state.isSelectingUpgrade) return state;

    let newState = { ...state };

    // Update Time
    newState.runTime += delta;

    // Update Orders (with time extension from upgrades)
    const orderTimeExtension = getOrderTimeExtension(state.upgrades);
    const { activeOrders, failedCount, failedItemIds } = updateOrders(newState.orders, delta);
    newState.orders = activeOrders;
    newState.failedOrders += failedCount;

    // Remove items associated with failed orders
    if (failedItemIds.length > 0) {
        newState.items = newState.items.filter(item => !failedItemIds.includes(item.id));
    }

    if (newState.failedOrders >= 5) {
        newState.isGameOver = true;
        return newState;
    }

    // Check win condition (survived the shift!)
    if (newState.runTime >= TARGET_RUN_TIME && !newState.hasWon) {
        newState.hasWon = true;
        return newState;
    }

    // Spawn Orders with dynamic rate (ramps up over time)
    // Each order spawns with its paired item (1:1 relationship)
    const currentSpawnRate = getOrderSpawnRate(newState.runTime);
    const lastSpawnTime = Math.floor((state.runTime - delta) / currentSpawnRate);
    const currentSpawnTime = Math.floor(state.runTime / currentSpawnRate);

    if (currentSpawnTime > lastSpawnTime) {
        const { order, item } = spawnOrderWithItem(newState.items, newState.runTime, orderTimeExtension);
        newState.orders = [...newState.orders, order];
        newState.items = [...newState.items, item];
    }

    // Conveyor Belt: Move items toward I/O port
    const conveyorSpeed = getConveyorSpeed(state.upgrades);
    if (conveyorSpeed > 0) {
        newState.items = newState.items.map(item => ({
            ...item,
            x: Math.max(IO_PORT.x, item.x - conveyorSpeed * (delta / 1000))
        }));
    }

    // Update Player (tap-to-move grid-aligned movement)
    const playerResult = updatePlayerMovement(
        newState.player,
        delta,
        newState.items,
        newState.grid,
        newState.orders,
        newState.upgrades,
        newState.robots
    );
    newState.player = playerResult.player;
    newState.items = playerResult.items;
    newState.orders = playerResult.orders;
    newState.xp += playerResult.xpGain;
    newState.ordersCompleted += playerResult.ordersCompleted;

    // Update Robots (with collision detection against player and other robots)
    const robotResult = updateRobots(
        newState.robots,
        newState.grid,
        newState.orders,
        newState.items,
        delta,
        state.upgrades,
        newState.player
    );

    newState.robots = robotResult.robots;
    newState.items = robotResult.items;
    newState.orders = robotResult.orders;

    // Grant XP for completed orders (with multiplier)
    if (robotResult.completedOrders.length > 0) {
        const xpMultiplier = getXpMultiplier(state.upgrades);
        const xpGain = Math.floor(robotResult.completedOrders.length * XP_PER_ORDER * xpMultiplier);
        newState.xp += xpGain;
        newState.ordersCompleted += robotResult.completedOrders.length;
    }

    // Check for level up
    newState = checkLevelUp(newState);

    return newState;
};

