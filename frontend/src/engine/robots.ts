import type { Robot, GridSlot, Item, Order, RobotState, UpgradeId, Player } from '../types/game';
import { IO_PORT, ROBOT_SPEED, HEAVY_ITEM_SLOWDOWN, HAZARDOUS_ITEM_RADIUS, HAZARDOUS_ITEM_SLOWDOWN, ROBOT_BLOCKED_THRESHOLD } from '../constants/config';
import { getRobotCollisionSlowdown } from './collision';
import {
    getRobotSpeedMultiplier,
    hasPriorityOrders,
    hasMultiCarry,
    hasPowerLifter,
    hasLeadSiding,
    getOverloadMultiplier
} from './upgrades';
import { findPath } from './astar';

/**
 * Build sets of occupied cells from robot, player, and item positions
 */
export const buildOccupancySets = (robots: Robot[], player: Player, items: Item[]): { hard: Set<string>, soft: Set<string> } => {
    const hard = new Set<string>();
    const soft = new Set<string>();

    // Player is a hard obstacle (robots cannot move through)
    hard.add(`${player.x},${player.y}`);

    // Items on the ground are soft obstacles (weighted pathfinding)
    for (const item of items) {
        if (item.status === 'on_ground') {
            soft.add(`${Math.round(item.x)},${Math.round(item.y)}`);
        }
    }

    // Other robots are soft obstacles (weighted pathfinding)
    for (const robot of robots) {
        soft.add(`${robot.x},${robot.y}`);
    }

    return { hard, soft };
};

/**
 * Find an item on the grid that matches an order type
 */
const findItemForOrder = (order: Order, items: Item[]): Item | null => {
    return items.find(item => item.id === order.itemId) || null;
};

/**
 * Find an unclaimed order that matches items we can pick up
 * If priority orders upgrade is active, prioritize orders with lowest time left
 */
const findAvailableOrder = (
    robot: Robot,
    orders: Order[],
    items: Item[],
    priorityOrdersActive: boolean
): Order | null => {
    // Sort by time left if priority orders is active
    let sortedOrders = [...orders];
    if (priorityOrdersActive) {
        sortedOrders = sortedOrders.sort((a, b) => a.timeLeft - b.timeLeft);
    }

    for (const order of sortedOrders) {
        // Skip if already claimed by another robot
        if (order.claimedBy && order.claimedBy !== robot.id) continue;

        // Check if there's an item for this order
        const item = findItemForOrder(order, items);
        if (!item) continue;

        return order;
    }

    return null;
};

/**
 * Get a jittered blocked threshold based on robot ID to break deadlocks
 */
const getBlockedThreshold = (robotId: string): number => {
    let hash = 0;
    for (let i = 0; i < robotId.length; i++) {
        hash = (hash << 5) - hash + robotId.charCodeAt(i);
        hash |= 0;
    }
    return ROBOT_BLOCKED_THRESHOLD + (Math.abs(hash) % 8);
};

/**
 * Move entity along its current A* path
 */
export const moveAlongPath = (
    entity: { x: number, y: number, path?: { x: number, y: number }[], moveProgress: number },
    delta: number,
    speed: number,
    hardObstacles: Set<string>
): { x: number; y: number; reached: boolean; moveProgress: number; newPath: { x: number, y: number }[]; blocked: boolean; blockedByHard: boolean } => {
    if (!entity.path || entity.path.length === 0) {
        return { x: entity.x, y: entity.y, reached: true, moveProgress: 0, newPath: [], blocked: false, blockedByHard: false };
    }

    // Current target is the first point in the path (if it's not our current position)
    let nextPoint = entity.path[0];
    const currentPath = [...entity.path];

    // If we're already at the next point, skip it
    if (nextPoint.x === entity.x && nextPoint.y === entity.y) {
        currentPath.shift();
        if (currentPath.length === 0) {
            return { x: entity.x, y: entity.y, reached: true, moveProgress: 0, newPath: [], blocked: false, blockedByHard: false };
        }
        nextPoint = currentPath[0];
    }

    // Calculate how much progress we make this tick
    const progressThisTick = speed * (delta / 1000);
    const newProgress = entity.moveProgress + progressThisTick;

    // If we haven't accumulated enough progress to move a cell, wait
    if (newProgress < 1) {
        return { x: entity.x, y: entity.y, reached: false, moveProgress: newProgress, newPath: currentPath, blocked: false, blockedByHard: false };
    }

    // Check if next cell is occupied by a HARD obstacle
    const cellKey = `${nextPoint.x},${nextPoint.y}`;
    if (hardObstacles.has(cellKey)) {
        // Path blocked by hard obstacle (Player)!
        return { x: entity.x, y: entity.y, reached: false, moveProgress: 0.8, newPath: currentPath, blocked: true, blockedByHard: true };
    }

    // Move is successful!
    return {
        x: nextPoint.x,
        y: nextPoint.y,
        reached: currentPath.length === 1,
        moveProgress: newProgress - 1,
        newPath: currentPath.slice(1),
        blocked: false,
        blockedByHard: false
    };
};

/**
 * State machine transition for a single robot
 */
const updateRobotState = (
    robot: Robot,
    items: Item[],
    orders: Order[],
    delta: number,
    collisionSlowdown: number,
    upgradeSpeedMultiplier: number,
    priorityOrdersActive: boolean,
    multiCarryActive: boolean,
    hardObstacles: Set<string>,
    softObstacles: Set<string>,
    allRobots: Robot[],
    upgrades: UpgradeId[]
): { robot: Robot; items: Item[]; orders: Order[]; completedOrders: Order[] } => {
    let totalSpeed = ROBOT_SPEED * robot.speedMultiplier * collisionSlowdown * upgradeSpeedMultiplier * getOverloadMultiplier(upgrades);
    const pickupRadius = upgrades.filter(u => u === 'longer_arms').length;

    // Stun logic: If robot is stunned (rebooting), it can't move or act
    if (robot.stunTicks > 0) {
        return {
            robot: { ...robot, stunTicks: Math.max(0, robot.stunTicks - 1) },
            items,
            orders,
            completedOrders: []
        };
    }

    // Heavy trait: Slowdown if carrying a red item (unless Power Lifter active)
    if (robot.carryingItems.some(i => i.type === 'red') && !hasPowerLifter(upgrades)) {
        totalSpeed *= HEAVY_ITEM_SLOWDOWN;
    }

    // Hazardous trait: Slowdown if near a green item (unless Lead Siding active)
    if (!hasLeadSiding(upgrades)) {
        const isNearHazard = items.some(i =>
            i.type === 'green' &&
            Math.sqrt(Math.pow(i.x - robot.x, 2) + Math.pow(i.y - robot.y, 2)) <= HAZARDOUS_ITEM_RADIUS
        ) || allRobots.some(r =>
            r.id !== robot.id &&
            r.carryingItems.some(i => i.type === 'green') &&
            Math.sqrt(Math.pow(r.x - robot.x, 2) + Math.pow(r.y - robot.y, 2)) <= HAZARDOUS_ITEM_RADIUS
        );

        if (isNearHazard) {
            totalSpeed *= HAZARDOUS_ITEM_SLOWDOWN;
        }
    }

    let updatedRobot = { ...robot };
    let updatedItems = [...items];
    let updatedOrders = [...orders];
    const completedOrders: Order[] = [];

    switch (robot.state) {
        case 'idle': {
            // Look for an order to fulfill
            const order = findAvailableOrder(robot, orders, items, priorityOrdersActive);
            if (order) {
                const item = findItemForOrder(order, items);
                if (item) {
                    // Claim the order and move to item
                    updatedOrders = orders.map(o =>
                        o.id === order.id ? { ...o, claimedBy: robot.id } : o
                    );
                    updatedRobot = {
                        ...robot,
                        state: 'moving_to_item' as RobotState,
                        target: { x: item.x, y: item.y },
                        targetOrderId: order.id,
                        targetOrderIds: [order.id],
                        path: [], // Let A* find the path next tick
                    };
                }
            }
            break;
        }

        case 'moving_to_item': {
            if (!robot.target) {
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, moveProgress: 0, blockedTicks: 0 };
                break;
            }

            // Check if the item we're moving to still exists
            const targetOrder = orders.find(o => o.id === robot.targetOrderId);
            const targetItem = targetOrder ? items.find(i => i.id === targetOrder.itemId) : null;

            if (!targetItem) {
                // Item was taken or order expired, go back to idle
                updatedRobot = {
                    ...robot,
                    state: 'idle' as RobotState,
                    target: null,
                    targetOrderId: undefined,
                    targetOrderIds: [],
                    path: [],
                    blockedTicks: 0
                };
                // Unclaim the order if it still exists
                if (targetOrder) {
                    updatedOrders = orders.map(o =>
                        o.id === targetOrder.id ? { ...o, claimedBy: undefined } : o
                    );
                }
                break;
            }

            // Robustness: If item has drifted to a different rounded cell, update target
            if (Math.round(targetItem.x) !== Math.round(robot.target!.x) ||
                Math.round(targetItem.y) !== Math.round(robot.target!.y)) {
                updatedRobot.target = { x: targetItem.x, y: targetItem.y };
                updatedRobot.path = []; // Recalculate path to new position
            }

            // Pathfinding: If we don't have a path or it's empty, find one
            if (!robot.path || robot.path.length === 0) {
                const path = findPath({ x: robot.x, y: robot.y }, robot.target, hardObstacles, softObstacles);
                if (path) {
                    updatedRobot.path = path;
                    updatedRobot.blockedTicks = 0;
                } else {
                    // Try again next tick
                    break;
                }
            }

            const { x, y, reached, moveProgress, newPath, blocked, blockedByHard } = moveAlongPath(
                updatedRobot,
                delta,
                totalSpeed,
                hardObstacles
            );

            // Proximity Pickup: If within pickup radius of target, consider it "reached"
            const distToTarget = Math.sqrt(Math.pow(robot.target.x - x, 2) + Math.pow(robot.target.y - y, 2));
            const actuallyReached = reached || distToTarget <= pickupRadius;

            updatedRobot = { ...updatedRobot, x, y, moveProgress, path: actuallyReached ? [] : newPath };

            if (blocked && !actuallyReached) {
                updatedRobot.blockedTicks = (updatedRobot.blockedTicks || 0) + 1;
                // If blocked by Player (hard obstacle), reroute faster
                const threshold = blockedByHard ? 3 : getBlockedThreshold(robot.id);
                if (updatedRobot.blockedTicks >= threshold) {
                    // Reroute! Clear path to force recalculation next tick
                    updatedRobot.path = [];
                    updatedRobot.blockedTicks = 0;
                }
            } else if (actuallyReached || x !== robot.x || y !== robot.y) {
                // Only reset if we actually made progress to a new cell or reached destination
                updatedRobot.blockedTicks = 0;
            }

            if (actuallyReached) {
                updatedRobot.state = 'picking';
                updatedRobot.moveProgress = 0;
                updatedRobot.path = [];
                updatedRobot.blockedTicks = 0;
            }
            break;
        }

        case 'picking': {
            // Pick up item within pickup radius (robust to fractional drift)
            const itemIndex = items.findIndex(item => {
                const dx = Math.abs(Math.round(item.x) - robot.x);
                const dy = Math.abs(Math.round(item.y) - robot.y);
                return dx <= pickupRadius && dy <= pickupRadius;
            });

            if (itemIndex !== -1) {
                const item = { ...items[itemIndex], status: 'carried' as const, carrierId: robot.id };
                updatedItems = [...items];
                updatedItems.splice(itemIndex, 1);

                const newCarryingItems = [...robot.carryingItems, item];
                const maxCapacity = multiCarryActive ? 2 : 1;

                if (newCarryingItems.length < maxCapacity) {
                    // Look for another order we can pick up
                    const anotherOrder = findAvailableOrder(
                        { ...robot, carryingItems: newCarryingItems },
                        updatedOrders.filter(o => !robot.targetOrderIds.includes(o.id)),
                        updatedItems,
                        priorityOrdersActive
                    );

                    if (anotherOrder) {
                        const anotherItem = findItemForOrder(anotherOrder, updatedItems);
                        if (anotherItem) {
                            // Claim the next order and move to it
                            updatedOrders = updatedOrders.map(o =>
                                o.id === anotherOrder.id ? { ...o, claimedBy: robot.id } : o
                            );
                            updatedRobot = {
                                ...updatedRobot,
                                carryingItems: newCarryingItems,
                                state: 'moving_to_item' as RobotState,
                                target: { x: anotherItem.x, y: anotherItem.y },
                                targetOrderId: anotherOrder.id,
                                targetOrderIds: [...robot.targetOrderIds, anotherOrder.id],
                                path: [], // Let A* find the path next tick
                                blockedTicks: 0,
                            };
                            break;
                        }
                    }
                }

                // If no more capacity or no more items, move to port
                updatedRobot = {
                    ...updatedRobot,
                    carryingItems: newCarryingItems,
                    state: 'moving_to_port' as RobotState,
                    target: { x: IO_PORT.x, y: IO_PORT.y },
                    path: [], // Let A* find the path next tick
                    blockedTicks: 0,
                };
            } else {
                // Item was taken, go back to idle
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, targetOrderId: undefined, targetOrderIds: [], blockedTicks: 0 };
                // Unclaim the orders
                if (robot.targetOrderIds.length > 0) {
                    updatedOrders = orders.map(o =>
                        robot.targetOrderIds.includes(o.id) ? { ...o, claimedBy: undefined } : o
                    );
                }
            }
            break;
        }

        case 'moving_to_port': {
            if (!robot.target) {
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, moveProgress: 0, blockedTicks: 0 };
                break;
            }

            // Pathfinding: If we don't have a path or it's empty, find one
            if (!robot.path || robot.path.length === 0) {
                const path = findPath({ x: robot.x, y: robot.y }, robot.target, hardObstacles, softObstacles);
                if (path) {
                    updatedRobot.path = path;
                    updatedRobot.blockedTicks = 0;
                } else {
                    // Try again next tick
                    break;
                }
            }

            const { x, y, reached, moveProgress, newPath, blocked, blockedByHard } = moveAlongPath(
                updatedRobot,
                delta,
                totalSpeed,
                hardObstacles
            );

            updatedRobot = { ...updatedRobot, x, y, moveProgress, path: newPath };

            if (blocked) {
                updatedRobot.blockedTicks = (updatedRobot.blockedTicks || 0) + 1;
                // If blocked by Player (hard obstacle), reroute faster
                const threshold = blockedByHard ? 3 : getBlockedThreshold(robot.id);
                if (updatedRobot.blockedTicks >= threshold) {
                    // Reroute! Clear path to force recalculation next tick
                    updatedRobot.path = [];
                    updatedRobot.blockedTicks = 0;
                }
            } else {
                updatedRobot.blockedTicks = 0;
            }

            if (reached) {
                updatedRobot.state = 'dropping';
                updatedRobot.moveProgress = 0;
                updatedRobot.path = [];
                updatedRobot.blockedTicks = 0;
            }
            break;
        }

        case 'dropping': {
            // Complete all orders for all carried items
            for (const carriedItem of robot.carryingItems) {
                const order = updatedOrders.find(o =>
                    robot.targetOrderIds.includes(o.id) && o.type === carriedItem.type
                );
                if (order) {
                    completedOrders.push(order);
                    updatedOrders = updatedOrders.filter(o => o.id !== order.id);
                }
            }

            // Drop complete, return to idle
            updatedRobot = {
                ...robot,
                carryingItems: [],
                state: 'idle' as RobotState,
                target: null,
                targetOrderId: undefined,
                targetOrderIds: [],
                blockedTicks: 0,
                stunTicks: (upgrades.includes('overload') && Math.random() < 0.1) ? 180 : 0 // 10% chance to stun for 3s (180 ticks at 60fps)
            };
            break;
        }
    }

    return { robot: updatedRobot, items: updatedItems, orders: updatedOrders, completedOrders };
};

/**
 * Update all robots for one tick
 */
export const updateRobots = (
    robots: Robot[],
    _grid: GridSlot[][],
    orders: Order[],
    items: Item[],
    delta: number,
    upgrades: UpgradeId[],
    player: Player
): { robots: Robot[]; items: Item[]; orders: Order[]; completedOrders: Order[] } => {
    const upgradeSpeedMultiplier = getRobotSpeedMultiplier(upgrades);
    const priorityOrdersActive = hasPriorityOrders(upgrades);
    const multiCarryActive = hasMultiCarry(upgrades);
    const allCompletedOrders: Order[] = [];

    let currentItems = items;
    let currentOrders = orders;
    const updatedRobots: Robot[] = [];

    // Build initial occupancy sets
    const { hard, soft } = buildOccupancySets(robots, player, items);

    for (const robot of robots) {
        const collisionSlowdown = getRobotCollisionSlowdown(robot, robots);

        // Remove current robot from soft obstacle set (it's about to move)
        soft.delete(`${robot.x},${robot.y}`);

        const result = updateRobotState(
            robot,
            currentItems,
            currentOrders,
            delta,
            collisionSlowdown,
            upgradeSpeedMultiplier,
            priorityOrdersActive,
            multiCarryActive,
            hard,
            soft,
            robots,
            upgrades
        );

        // Add robot's new position to soft obstacle set
        soft.add(`${result.robot.x},${result.robot.y}`);

        // CELL RESERVATION: No longer strictly necessary for pathfinding since we use weights,
        // but can still be used as a soft obstacle to encourage other robots to keep distance.
        if (result.robot.path && result.robot.path.length > 0) {
            const nextStep = result.robot.path[0];
            soft.add(`${nextStep.x},${nextStep.y}`);
        }

        updatedRobots.push(result.robot);
        currentItems = result.items;
        currentOrders = result.orders;
        allCompletedOrders.push(...result.completedOrders);
    }

    return { robots: updatedRobots, items: currentItems, orders: currentOrders, completedOrders: allCompletedOrders };
};

/**
 * Create a new robot at the I/O port
 */
export const createRobot = (existingRobots: Robot[]): Robot => {
    return {
        id: `robot-${existingRobots.length + 1}-${Date.now()}`,
        x: IO_PORT.x + 1,
        y: IO_PORT.y,
        carryingItems: [],
        state: 'idle',
        target: null,
        targetOrderIds: [],
        speedMultiplier: 1.0,
        moveProgress: 0,
        blockedTicks: 0,
        stunTicks: 0,
    };
};

