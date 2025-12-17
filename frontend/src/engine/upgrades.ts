import type { Upgrade, UpgradeId } from '../types/game';
import { CONVEYOR_SPEED, DOUBLE_XP_MULTIPLIER } from '../constants/config';

// The complete pool of upgrades available in runs
export const UPGRADE_POOL: Upgrade[] = [
    {
        id: 'faster_robots',
        name: 'Faster Robots',
        description: 'All robots operate 25% faster',
        icon: '⚡',
        stackable: true,
    },
    {
        id: 'speed_boots',
        name: 'Speed Boots',
        description: 'Move 30% faster',
        icon: '👟',
        stackable: true,
    },
    {
        id: 'longer_arms',
        name: 'Longer Arms',
        description: 'Pickup radius +1 cell',
        icon: '🦾',
        stackable: true,
    },
    {
        id: 'extra_robot',
        name: 'Extra Robot',
        description: 'Spawn a new robot at I/O port',
        icon: '🤖',
        stackable: true,
    },
    {
        id: 'order_extension',
        name: 'Order Extension',
        description: 'Orders get +5s time',
        icon: '⏰',
        stackable: true,
    },
    {
        id: 'conveyor_belt',
        name: 'Conveyor Belt',
        description: 'Items drift toward I/O port',
        icon: '🔄',
        stackable: true,
    },
    {
        id: 'priority_orders',
        name: 'Priority Orders',
        description: 'Robots tackle urgent orders first',
        icon: '🚨',
        stackable: false,
    },
    {
        id: 'multi_carry',
        name: 'Multi-Carry',
        description: 'Robots can carry 2 items at once',
        icon: '📦',
        stackable: false,
    },
    {
        id: 'double_xp',
        name: 'Double XP',
        description: '2x XP from completed orders',
        icon: '⭐',
        stackable: true,
    },
    {
        id: 'order_radar',
        name: 'Order Radar',
        description: 'Urgent orders glow red',
        icon: '📡',
        stackable: false,
    },
];

/**
 * Get random upgrades for level-up selection
 * @param count Number of upgrades to offer
 * @param ownedUpgrades Already owned non-stackable upgrades to exclude
 */
export const getRandomUpgrades = (count: number, ownedUpgrades: UpgradeId[]): Upgrade[] => {
    // Filter out non-stackable upgrades that are already owned
    const availableUpgrades = UPGRADE_POOL.filter(
        upgrade => upgrade.stackable || !ownedUpgrades.includes(upgrade.id)
    );

    // Shuffle and pick
    const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
};

/**
 * Count how many times a specific upgrade has been taken
 */
export const countUpgrade = (upgrades: UpgradeId[], upgradeId: UpgradeId): number => {
    return upgrades.filter(id => id === upgradeId).length;
};

/**
 * Calculate effective player speed multiplier from upgrades
 */
export const getPlayerSpeedMultiplier = (upgrades: UpgradeId[]): number => {
    const speedBootsCount = countUpgrade(upgrades, 'speed_boots');
    return 1 + (speedBootsCount * 0.30); // +30% per Speed Boots
};

/**
 * Calculate effective robot speed multiplier from upgrades
 */
export const getRobotSpeedMultiplier = (upgrades: UpgradeId[]): number => {
    const fasterRobotsCount = countUpgrade(upgrades, 'faster_robots');
    return 1 + (fasterRobotsCount * 0.25); // +25% per Faster Robots
};

/**
 * Calculate pickup radius from upgrades
 */
export const getPickupRadius = (upgrades: UpgradeId[]): number => {
    const longerArmsCount = countUpgrade(upgrades, 'longer_arms');
    return longerArmsCount; // Base is 0 (same cell), each upgrade adds 1
};

/**
 * Calculate order time extension from upgrades
 */
export const getOrderTimeExtension = (upgrades: UpgradeId[]): number => {
    const extensionCount = countUpgrade(upgrades, 'order_extension');
    return extensionCount * 5000; // +5s per upgrade
};

// ============ NEW UPGRADE HELPERS ============

/**
 * Get conveyor belt speed (items drift toward I/O port)
 */
export const getConveyorSpeed = (upgrades: UpgradeId[]): number => {
    const conveyorCount = countUpgrade(upgrades, 'conveyor_belt');
    return conveyorCount * CONVEYOR_SPEED; // Stacks for faster drift
};

/**
 * Check if priority orders is active (robots prioritize urgent orders)
 */
export const hasPriorityOrders = (upgrades: UpgradeId[]): boolean => {
    return upgrades.includes('priority_orders');
};

/**
 * Check if multi-carry is active (robots carry 2 items)
 */
export const hasMultiCarry = (upgrades: UpgradeId[]): boolean => {
    return upgrades.includes('multi_carry');
};

/**
 * Get XP multiplier from double XP upgrades
 */
export const getXpMultiplier = (upgrades: UpgradeId[]): number => {
    const doubleXpCount = countUpgrade(upgrades, 'double_xp');
    return 1 + (doubleXpCount * (DOUBLE_XP_MULTIPLIER - 1)); // 1x, 2x, 3x, etc.
};

/**
 * Check if order radar is active (urgent orders glow)
 */
export const hasOrderRadar = (upgrades: UpgradeId[]): boolean => {
    return upgrades.includes('order_radar');
};
