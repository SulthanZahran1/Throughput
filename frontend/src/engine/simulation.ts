import type { GameState, Player, Robot } from '../types/game';
import { updateOrders, spawnOrderWithItem } from './orders';
import { updateRobots } from './robots';
import {
    XP_PER_ORDER,
    XP_PER_LEVEL,
    TARGET_RUN_TIME,
    IO_PORT,
    getOrderSpawnRate,
    PLAYER_SPEED,
    HEAVY_ITEM_SLOWDOWN,
    HAZARDOUS_ITEM_RADIUS,
    HAZARDOUS_ITEM_SLOWDOWN,
    isRushHour,
    RUSH_HOUR_XP_MULTIPLIER,
    RUSH_HOUR_SPAWN_MULTIPLIER,
} from '../constants/config';
import {
    getRandomUpgrades,
    getOrderTimeExtension,
    getConveyorSpeed,
    getXpMultiplier,
    hasPowerLifter,
    hasLeadSiding,
    getOverloadMultiplier
} from './upgrades';
import { tryPickupItem } from './player';
import { findPath } from './astar';
import { buildOccupancySets, moveAlongPath } from './robots';

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
    robots: Robot[],
    runTime: number,
    addFloatingXp?: (amount: number, x: number, y: number) => void
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
    let speedMultiplier = player.speedMultiplier;

    // Heavy trait: Slowdown if carrying a red item (unless Power Lifter active)
    if (player.carrying?.type === 'red' && !hasPowerLifter(upgrades)) {
        speedMultiplier *= HEAVY_ITEM_SLOWDOWN;
    }

    // Hazardous trait: Slowdown if near a green item (unless Lead Siding active)
    if (!hasLeadSiding(upgrades)) {
        const isNearHazard = items.some(i =>
            i.type === 'green' &&
            Math.sqrt(Math.pow(i.x - player.x, 2) + Math.pow(i.y - player.y, 2)) <= HAZARDOUS_ITEM_RADIUS
        ) || robots.some(r =>
            r.carryingItems.some(i => i.type === 'green') &&
            Math.sqrt(Math.pow(r.x - player.x, 2) + Math.pow(r.y - player.y, 2)) <= HAZARDOUS_ITEM_RADIUS
        );

        if (isNearHazard) {
            speedMultiplier *= HAZARDOUS_ITEM_SLOWDOWN;
        }
    }

    const effectiveSpeed = PLAYER_SPEED * speedMultiplier * getOverloadMultiplier(upgrades);
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
    // effectiveSpeed is already calculated above

    // Build occupancy sets
    const { soft: robotCells } = buildOccupancySets(robots, player, items);

    // For player pathfinding:
    // Robots are "hard" obstacles to some degree, but let's treat them as soft for player too
    // so player can find a path through a crowd if no other way exists, then wait for them to move.
    // Or better: robots are hard for player manual movement, but soft for A* tap-to-move rerouting.

    // Pathfinding: If we don't have a path or it's empty, find one
    let currentPath = player.path || [];
    if (currentPath.length === 0) {
        // Player treats robots as soft obstacles (high cost) to avoid being completely stuck
        const path = findPath(
            { x: player.x, y: player.y },
            { x: player.targetX, y: player.targetY },
            new Set(), // No "hard" obstacles for player pathfinding (they wait/reroute)
            robotCells
        );
        if (path) {
            currentPath = path;
        } else {
            // Try again next tick
            return {
                player: { ...player, moveProgress: 0.5 },
                items,
                orders,
                xpGain: 0,
                ordersCompleted: 0
            };
        }
    }

    const { x: newX, y: newY, reached, moveProgress, newPath, blocked } = moveAlongPath(
        { ...player, path: currentPath },
        delta,
        effectiveSpeed,
        robotCells
    );

    // Current player behavior: walk exactly to target unless an item is picked up along the way
    let arrivedAtTarget = reached;

    let updatedPlayer: Player = {
        ...player,
        x: newX,
        y: newY,
        targetX: arrivedAtTarget ? null : player.targetX,
        targetY: arrivedAtTarget ? null : player.targetY,
        moveProgress: arrivedAtTarget ? 0 : moveProgress,
        path: (reached || blocked) ? [] : newPath,
    };
    let updatedItems = items;
    let updatedOrders = orders;
    let xpGain = 0;
    let ordersCompletedCount = 0;

    // Try to pick up item at new location (uses player.pickupRadius internally)
    const pickupResult = tryPickupItem(updatedPlayer, grid, updatedItems);
    if (pickupResult) {
        updatedPlayer = {
            ...pickupResult.player,
            // If we successfully picked up an item, we can stop moving if the item was our near-target
            targetX: null,
            targetY: null,
            path: [],
            moveProgress: 0
        };
        updatedItems = pickupResult.items;
        arrivedAtTarget = true;
    }

    // Check if player is at I/O port with an item (deliver)
    if (updatedPlayer.carrying &&
        updatedPlayer.x === IO_PORT.x &&
        updatedPlayer.y === IO_PORT.y) {

        const carriedType = updatedPlayer.carrying.type;
        const matchingOrder = updatedOrders.find(o => o.type === carriedType);

        if (matchingOrder) {
            const xpMultiplier = getXpMultiplier(upgrades);
            let xp = XP_PER_ORDER * xpMultiplier;

            // Surge: Rush Hour XP bonus
            if (isRushHour(runTime)) {
                xp *= RUSH_HOUR_XP_MULTIPLIER;
            }

            xpGain = Math.floor(xp);
            // Trigger floating XP notification
            addFloatingXp?.(xpGain, IO_PORT.x, IO_PORT.y);

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
    const { activeOrders, failedCount, failedItemIds } = updateOrders(newState.orders, delta, newState.items);
    newState.orders = activeOrders;
    newState.failedOrders += failedCount;

    // Handle items associated with failed orders
    if (failedItemIds.length > 0) {
        // 1. Remove from ground
        newState.items = newState.items.filter(item => !failedItemIds.includes(item.id));

        // 2. Remove from player
        if (newState.player.carrying && failedItemIds.includes(newState.player.carrying.id)) {
            newState.player = { ...newState.player, carrying: null };
        }

        // 3. Remove from robots
        newState.robots = newState.robots.map(robot => {
            const stillCarrying = robot.carryingItems.filter(item => !failedItemIds.includes(item.id));
            const lostItems = robot.carryingItems.length - stillCarrying.length;

            if (lostItems > 0) {
                // If robot lost all items it was carrying, and it was moving to port or dropping, reset it
                let nextRobotState = robot.state;
                let nextTarget = robot.target;
                let nextTargetOrderId = robot.targetOrderId;
                let nextTargetOrderIds = robot.targetOrderIds.filter(id =>
                    !newState.orders.some(o => failedItemIds.includes(o.itemId) && o.id === id)
                );

                // More robust: if the item for targetOrderId is gone, reset targetOrderId
                const targetOrder = state.orders.find(o => o.id === robot.targetOrderId);
                if (targetOrder && failedItemIds.includes(targetOrder.itemId)) {
                    nextTargetOrderId = undefined;
                }

                if (stillCarrying.length === 0 && (robot.state === 'moving_to_port' || robot.state === 'dropping')) {
                    nextRobotState = 'idle';
                    nextTarget = null;
                    nextTargetOrderId = undefined;
                    nextTargetOrderIds = [];
                }

                return {
                    ...robot,
                    carryingItems: stillCarrying,
                    state: nextRobotState,
                    target: nextTarget,
                    targetOrderId: nextTargetOrderId,
                    targetOrderIds: nextTargetOrderIds,
                    path: stillCarrying.length === 0 ? [] : robot.path
                };
            }
            return robot;
        });
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
    let currentSpawnRate = getOrderSpawnRate(newState.runTime);

    // Surge: Rush Hour Spawning (faster)
    if (isRushHour(newState.runTime)) {
        currentSpawnRate /= RUSH_HOUR_SPAWN_MULTIPLIER;
    }

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
        newState.robots,
        newState.runTime,
        (newState as any).addFloatingXp
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
        let xpPerOrder = XP_PER_ORDER * xpMultiplier;

        // Surge: Rush Hour XP bonus
        if (isRushHour(newState.runTime)) {
            xpPerOrder *= RUSH_HOUR_XP_MULTIPLIER;
        }

        const xpGain = Math.floor(robotResult.completedOrders.length * xpPerOrder);
        newState.xp += xpGain;
        newState.ordersCompleted += robotResult.completedOrders.length;

        // Trigger floating XP notification(s) at I/O port
        (newState as any).addFloatingXp?.(xpGain, IO_PORT.x, IO_PORT.y);
    }

    // Check for level up
    newState = checkLevelUp(newState);

    return newState;
};

