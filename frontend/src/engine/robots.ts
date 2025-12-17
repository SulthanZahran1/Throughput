import type { Robot, GridSlot, Item, Order, RobotState, UpgradeId } from '../types/game';
import { ROBOT_SPEED, IO_PORT } from '../constants/config';
import { getRobotCollisionSlowdown } from './collision';
import { getRobotSpeedMultiplier, hasPriorityOrders, hasMultiCarry } from './upgrades';

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
 * Move robot towards target position (grid-aligned, moves in cardinal directions only)
 * Returns new position and whether target is reached
 */
const moveTowards = (
    robot: Robot,
    targetX: number,
    targetY: number,
    delta: number,
    speedMultiplier: number
): { x: number; y: number; reached: boolean } => {
    const dx = targetX - robot.x;
    const dy = targetY - robot.y;

    // Check if we've reached the target
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return { x: targetX, y: targetY, reached: true };
    }

    const speed = ROBOT_SPEED * speedMultiplier * (delta / 1000);
    let newX = robot.x;
    let newY = robot.y;

    // Move in one direction at a time (horizontal first, then vertical)
    if (Math.abs(dx) > 0.1) {
        // Move horizontally
        const moveX = Math.min(speed, Math.abs(dx));
        newX = robot.x + (dx > 0 ? moveX : -moveX);
    } else if (Math.abs(dy) > 0.1) {
        // Move vertically
        const moveY = Math.min(speed, Math.abs(dy));
        newY = robot.y + (dy > 0 ? moveY : -moveY);
    }

    return { x: newX, y: newY, reached: false };
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
    multiCarryActive: boolean
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
                    };
                }
            }
            break;
        }

        case 'moving_to_item': {
            if (!robot.target) {
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null };
                break;
            }

            const { x, y, reached } = moveTowards(
                robot,
                robot.target.x,
                robot.target.y,
                delta,
                totalSpeedMultiplier
            );

            updatedRobot = { ...robot, x, y };

            if (reached) {
                updatedRobot.state = 'picking';
            }
            break;
        }

        case 'picking': {
            // Pick up item at current location
            const itemIndex = items.findIndex(
                item => Math.abs(item.x - robot.x) < 0.5 && Math.abs(item.y - robot.y) < 0.5
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
                updatedRobot = { ...robot, state: 'idle' as RobotState, target: null };
                break;
            }

            const { x, y, reached } = moveTowards(
                robot,
                robot.target.x,
                robot.target.y,
                delta,
                totalSpeedMultiplier
            );

            updatedRobot = { ...robot, x, y };

            if (reached) {
                updatedRobot.state = 'dropping';
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
    upgrades: UpgradeId[]
): { robots: Robot[]; items: Item[]; orders: Order[]; completedOrders: Order[] } => {
    const upgradeSpeedMultiplier = getRobotSpeedMultiplier(upgrades);
    const priorityOrdersActive = hasPriorityOrders(upgrades);
    const multiCarryActive = hasMultiCarry(upgrades);
    const allCompletedOrders: Order[] = [];

    let currentItems = items;
    let currentOrders = orders;
    const updatedRobots: Robot[] = [];

    for (const robot of robots) {
        const collisionSlowdown = getRobotCollisionSlowdown(robot, robots);

        const result = updateRobotState(
            robot,
            currentItems,
            currentOrders,
            delta,
            collisionSlowdown,
            upgradeSpeedMultiplier,
            priorityOrdersActive,
            multiCarryActive
        );

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
    };
};

