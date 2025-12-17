import type { GameState, Player } from '../types/game';
import { updateOrders, spawnOrderWithItem } from './orders';
import { updateRobots } from './robots';
import {
    XP_PER_ORDER,
    XP_PER_LEVEL,
    TARGET_RUN_TIME,
    IO_PORT,
    PLAYER_SPEED,
    getOrderSpawnRate,
} from '../constants/config';
import { getRandomUpgrades, getOrderTimeExtension, getConveyorSpeed, getXpMultiplier } from './upgrades';
import { tryPickupItem } from './player';

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
 * Move player toward target position (tap-to-move)
 */
const updatePlayerMovement = (player: Player, delta: number, items: GameState['items'], grid: GameState['grid'], orders: GameState['orders'], upgrades: GameState['upgrades']): { player: Player; items: GameState['items']; orders: GameState['orders']; xpGain: number; ordersCompleted: number } => {
    if (player.targetX === null || player.targetY === null) {
        return { player, items, orders, xpGain: 0, ordersCompleted: 0 };
    }

    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;

    // Check if we've reached the target
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return {
            player: { ...player, x: player.targetX, y: player.targetY, targetX: null, targetY: null },
            items,
            orders,
            xpGain: 0,
            ordersCompleted: 0,
        };
    }

    const speed = PLAYER_SPEED * player.speedMultiplier * (delta / 1000);
    let newX = player.x;
    let newY = player.y;

    // Move toward target (move in both directions smoothly)
    if (Math.abs(dx) > 0.01) {
        const moveX = Math.min(speed, Math.abs(dx));
        newX = player.x + (dx > 0 ? moveX : -moveX);
    }
    if (Math.abs(dy) > 0.01) {
        const moveY = Math.min(speed, Math.abs(dy));
        newY = player.y + (dy > 0 ? moveY : -moveY);
    }

    let updatedPlayer = { ...player, x: newX, y: newY };
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
        Math.abs(updatedPlayer.x - IO_PORT.x) <= 1.5 &&
        Math.abs(updatedPlayer.y - IO_PORT.y) <= 1.5) {

        const carriedType = updatedPlayer.carrying.type;
        const matchingOrder = updatedOrders.find(o => o.type === carriedType);

        if (matchingOrder) {
            const xpMultiplier = getXpMultiplier(upgrades);
            xpGain = Math.floor(25 * xpMultiplier); // XP_PER_ORDER
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

    // Update Player (tap-to-move smooth movement)
    const playerResult = updatePlayerMovement(
        newState.player,
        delta,
        newState.items,
        newState.grid,
        newState.orders,
        newState.upgrades
    );
    newState.player = playerResult.player;
    newState.items = playerResult.items;
    newState.orders = playerResult.orders;
    newState.xp += playerResult.xpGain;
    newState.ordersCompleted += playerResult.ordersCompleted;

    // Update Robots (no power slowdown anymore)
    const robotResult = updateRobots(
        newState.robots,
        newState.grid,
        newState.orders,
        newState.items,
        delta,
        state.upgrades
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

