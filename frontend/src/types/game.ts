export type ItemType = 'red' | 'blue' | 'green';

export interface Item {
    id: string;
    type: ItemType;
    x: number;
    y: number;
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
}

export interface Player {
    x: number;
    y: number;
    carrying: Item | null;
    speedMultiplier: number; // From upgrades
    pickupRadius: number; // From upgrades (Longer Arms)
    targetX: number | null; // Target to walk towards (tap-to-move)
    targetY: number | null;
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
