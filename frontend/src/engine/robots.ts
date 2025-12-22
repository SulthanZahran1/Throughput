import type { Robot, GridSlot, Item, Order, RobotState, UpgradeId, Player } from '../types/game';
import { IO_PORT, ROBOT_SPEED, GRID_SIZE } from '../constants/config';
import { getRobotCollisionSlowdown } from './collision';
import { getRobotSpeedMultiplier, hasPriorityOrders, hasMultiCarry } from './upgrades';
import { findPath } from './astar';

/**
 * Build a set of occupied cells from robot and player positions
 */
export const buildOccupiedCells = (robots: Robot[], player: Player): Set<string> => {
    const occupied = new Set<string>();
    for (const robot of robots) {
        occupied.add(`${robot.x},${robot.y}`);
    }
    occupied.add(`${player.x},${player.y}`);
    return occupied;
};

/**
 * Find an item on the grid that matches an order type
 */
const findItemForOrder = (order: Order, items: Item[]): Item | null => {
    return items.find(item => item.type === order.type) || null;
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
 * Move robot along its current A* path
 */
const moveAlongPath = (
    robot: Robot,
    delta: number,
    speedMultiplier: number,
    occupiedCells: Set<string>
): { x: number; y: number; reached: boolean; moveProgress: number; newPath: { x: number, y: number }[] } => {
    if (!robot.path || robot.path.length === 0) {
        return { x: robot.x, y: robot.y, reached: true, moveProgress: 0, newPath: [] };
    }

    // Current target is the first point in the path (if it's not our current position)
    let nextPoint = robot.path[0];
    let currentPath = [...robot.path];

    // If we're already at the next point, skip it
    if (nextPoint.x === robot.x && nextPoint.y === robot.y) {
        currentPath.shift();
        if (currentPath.length === 0) {
            return { x: robot.x, y: robot.y, reached: true, moveProgress: 0, newPath: [] };
        }
        nextPoint = currentPath[0];
    }

    // Calculate how much progress we make this tick
    const effectiveSpeed = ROBOT_SPEED * speedMultiplier;
    const progressThisTick = effectiveSpeed * (delta / 1000);
    const newProgress = robot.moveProgress + progressThisTick;

    // If we haven't accumulated enough progress to move a cell, wait
    if (newProgress < 1) {
        return { x: robot.x, y: robot.y, reached: false, moveProgress: newProgress, newPath: currentPath };
    }

    // Check if next cell is occupied
    const cellKey = `${nextPoint.x},${nextPoint.y}`;
    if (occupiedCells.has(cellKey)) {
        // Path blocked! Wait and try to nudge neighbor if waiting too long (simplified: just wait)
        return { x: robot.x, y: robot.y, reached: false, moveProgress: 0.8, newPath: currentPath }; // Reset progress slightly to retry
    }

    // Move is successful!
    return {
        x: nextPoint.x,
        y: nextPoint.y,
        reached: currentPath.length === 1,
        moveProgress: newProgress - 1,
        newPath: currentPath.slice(1)
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
    occupiedCells: Set<string>
): { robot: Robot; items: Item[]; orders: Order[]; completedOrders: Order[] } => {
    const totalSpeedMultiplier = robot.speedMultiplier * collisionSlowdown * upgradeSpeedMultiplier;
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
                        path: [{ x: robot.x, y: robot.y }, { x: item.x, y: item.y }],
                    };
                }
            }
            break;
        }

        case 'moving_to_item': {
            if (!robot.target) {
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, moveProgress: 0 };
                break;
            }

            // Pathfinding: If we don't have a path or it's empty, find one
            if (!robot.path || robot.path.length === 0) {
                const path = findPath({ x: robot.x, y: robot.y }, robot.target, occupiedCells);
                if (path) {
                    updatedRobot.path = path;
                } else {
                    // Try again next tick
                    break;
                }
            }

            const { x, y, reached, moveProgress, newPath } = moveAlongPath(
                updatedRobot,
                delta,
                totalSpeedMultiplier,
                occupiedCells
            );

            updatedRobot = { ...updatedRobot, x, y, moveProgress, path: newPath };

            if (reached) {
                updatedRobot.state = 'picking';
                updatedRobot.moveProgress = 0;
                updatedRobot.path = [];
            }
            break;
        }

        case 'picking': {
            // Pick up item at current location (exact grid position)
            const itemIndex = items.findIndex(
                item => item.x === robot.x && item.y === robot.y
            );

            if (itemIndex !== -1) {
                const item = items[itemIndex];
                updatedItems = [...items];
                updatedItems.splice(itemIndex, 1);

                const newCarryingItems = [...robot.carryingItems, item];

                // Check if we can carry more items (multi-carry upgrade)
                const maxCapacity = multiCarryActive ? 2 : 1;

                if (newCarryingItems.length < maxCapacity) {
                    // Look for another order we can pick up at same location
                    const anotherOrder = findAvailableOrder(
                        { ...robot, carryingItems: newCarryingItems },
                        updatedOrders.filter(o => o.id !== robot.targetOrderId),
                        updatedItems,
                        priorityOrdersActive
                    );

                    if (anotherOrder) {
                        const anotherItem = findItemForOrder(anotherOrder, updatedItems);
                        if (anotherItem && Math.abs(anotherItem.x - robot.x) < 1 && Math.abs(anotherItem.y - robot.y) < 1) {
                            // Pick up second item too
                            const secondItemIndex = updatedItems.findIndex(i => i.id === anotherItem.id);
                            if (secondItemIndex !== -1) {
                                updatedItems.splice(secondItemIndex, 1);
                                newCarryingItems.push(anotherItem);
                                updatedOrders = updatedOrders.map(o =>
                                    o.id === anotherOrder.id ? { ...o, claimedBy: robot.id } : o
                                );
                                updatedRobot.targetOrderIds = [...robot.targetOrderIds, anotherOrder.id];
                            }
                        }
                    }
                }

                updatedRobot = {
                    ...updatedRobot,
                    carryingItems: newCarryingItems,
                    state: 'moving_to_port' as RobotState,
                    target: { x: IO_PORT.x, y: IO_PORT.y },
                    path: [{ x: updatedRobot.x, y: updatedRobot.y }, { x: IO_PORT.x, y: IO_PORT.y }],
                };
            } else {
                // Item was taken, go back to idle
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, targetOrderId: undefined, targetOrderIds: [] };
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
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null, moveProgress: 0 };
                break;
            }

            // Pathfinding: If we don't have a path or it's empty, find one
            if (!robot.path || robot.path.length === 0) {
                const path = findPath({ x: robot.x, y: robot.y }, robot.target, occupiedCells);
                if (path) {
                    updatedRobot.path = path;
                } else {
                    // Try again next tick
                    break;
                }
            }

            const { x, y, reached, moveProgress, newPath } = moveAlongPath(
                updatedRobot,
                delta,
                totalSpeedMultiplier,
                occupiedCells
            );

            updatedRobot = { ...updatedRobot, x, y, moveProgress, path: newPath };

            if (reached) {
                updatedRobot.state = 'dropping';
                updatedRobot.moveProgress = 0;
                updatedRobot.path = [];
            }
            break;
        }

        case 'dropping': {
            // Complete all orders for all carried items
            for (const carriedItem of robot.carryingItems) {
                const order = orders.find(o =>
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

    // Build initial occupied cells (all robots + player)
    // As each robot moves, we update the set
    const occupiedCells = buildOccupiedCells(robots, player);

    for (const robot of robots) {
        const collisionSlowdown = getRobotCollisionSlowdown(robot, robots);

        // Remove current robot from occupied set (it's about to move)
        occupiedCells.delete(`${robot.x},${robot.y}`);

        const result = updateRobotState(
            robot,
            currentItems,
            currentOrders,
            delta,
            collisionSlowdown,
            upgradeSpeedMultiplier,
            priorityOrdersActive,
            multiCarryActive,
            occupiedCells
        );

        // Add robot's new position to occupied set
        occupiedCells.add(`${result.robot.x},${result.robot.y}`);

        // CELL RESERVATION: If robot is moving, reserve its next step too
        if (result.robot.path && result.robot.path.length > 0) {
            const nextStep = result.robot.path[0];
            occupiedCells.add(`${nextStep.x},${nextStep.y}`);
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
    };
};

