export type ItemType = 'red' | 'blue' | 'green';

export type ItemStatus = 'on_ground' | 'carried' | 'delivered' | 'expired';

export interface Item {
    id: string;
    type: ItemType;
    x: number;
    y: number;
    status: ItemStatus;
    carrierId?: string; // 'player' or robot ID
}

export interface Order {
    id: string;
    type: ItemType;
    timeLeft: number; // in milliseconds
    totalTime: number;
    claimedBy?: string; // Robot ID that claimed this order
    itemId: string; // 1:1 pairing with the spawned item
}

// Robot FSM States
export type RobotState = 'idle' | 'moving_to_item' | 'picking' | 'moving_to_port' | 'dropping';

export interface Robot {
    id: string;
    x: number;
    y: number;
    carryingItems: Item[]; // Multiple items for multi-carry upgrade
    state: RobotState;
    target: { x: number; y: number } | null;
    targetOrderId?: string; // Order being fulfilled
    targetOrderIds: string[]; // Multiple orders for multi-carry
    speedMultiplier: number; // Base speed modifier from upgrades
    moveProgress: number; // Accumulated time towards next cell move (0-1)
    path?: { x: number, y: number }[]; // Current planned path for visualization
    blockedTicks: number; // Number of ticks the robot has been blocked
}

export interface Player {
    x: number;
    y: number;
    carrying: Item | null;
    speedMultiplier: number; // From upgrades
    pickupRadius: number; // From upgrades (Longer Arms)
    targetX: number | null; // Target to walk towards (tap-to-move)
    targetY: number | null;
    moveProgress: number; // Accumulated time towards next cell move (0-1)
    path?: { x: number, y: number }[]; // Current planned path for visualization
}

export interface GridSlot {
    x: number;
    y: number;
    item: Item | null;
}

// Upgrade System
export type UpgradeId =
    | 'faster_robots'
    | 'speed_boots'
    | 'longer_arms'
    | 'extra_robot'
    | 'order_extension'
    | 'conveyor_belt'
    | 'priority_orders'
    | 'multi_carry'
    | 'double_xp'
    | 'order_radar';

export interface Upgrade {
    id: UpgradeId;
    name: string;
    description: string;
    icon: string; // Emoji or icon name
    stackable: boolean; // Can be picked multiple times
}

export interface GameState {
    player: Player;
    grid: GridSlot[][];
    items: Item[]; // Items on the ground (not in slots)
    orders: Order[];
    robots: Robot[];

    // Progression
    xp: number;
    level: number;
    upgrades: UpgradeId[]; // IDs of acquired upgrades

    // Upgrade Selection UI
    isSelectingUpgrade: boolean;
    pendingUpgrades: Upgrade[]; // 3 choices when leveling up

    // Run state
    runTime: number;
    failedOrders: number;
    isGameOver: boolean;
    hasWon: boolean;

    // Stats
    ordersCompleted: number;
}
