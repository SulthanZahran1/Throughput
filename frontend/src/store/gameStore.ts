import { create } from 'zustand';
import type { GameState, GridSlot, UpgradeId, Robot } from '../types/game';
import { GRID_SIZE, IO_PORT, XP_PER_ORDER } from '../constants/config';
import { tickGame } from '../engine/simulation';
import { createRobot } from '../engine/robots';
import { applyPlayerUpgrades, tryPickupItem } from '../engine/player';
import { getXpMultiplier } from '../engine/upgrades';

interface GameActions {
    tick: (delta: number) => void;
    movePlayer: (dx: number, dy: number) => void;
    setPlayerTarget: (x: number, y: number) => void;
    clearPlayerTarget: () => void;
    selectUpgrade: (upgradeId: UpgradeId) => void;
    restart: () => void;
}

const createInitialGrid = (): GridSlot[][] => {
    const grid: GridSlot[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        const row: GridSlot[] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ x, y, item: null });
        }
        grid.push(row);
    }
    return grid;
};

// Create initial robot at I/O port
const createInitialRobot = (): Robot => ({
    id: 'robot-1-initial',
    x: IO_PORT.x + 2,
    y: IO_PORT.y,
    carryingItems: [],
    state: 'idle',
    target: null,
    targetOrderIds: [],
    speedMultiplier: 1.0,
    moveProgress: 0,
});

const initialState: GameState = {
    player: {
        x: 5,
        y: 5,
        carrying: null,
        speedMultiplier: 1.0,
        pickupRadius: 0,
        targetX: null,
        targetY: null,
        moveProgress: 0,
    },
    grid: createInitialGrid(),
    items: [],
    orders: [],
    robots: [createInitialRobot()],
    xp: 0,
    level: 1,
    upgrades: [],
    isSelectingUpgrade: false,
    pendingUpgrades: [],
    runTime: 0,
    failedOrders: 0,
    isGameOver: false,
    hasWon: false,
    ordersCompleted: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
    ...initialState,

    tick: (delta: number) => {
        set((state) => {
            // Items are now spawned 1:1 with orders in tickGame
            return tickGame(state, delta);
        });
    },

    movePlayer: (dx: number, dy: number) => {
        set((state) => {
            if (state.isGameOver || state.isSelectingUpgrade) return state;

            // Clear tap-to-move target when using keyboard
            // Player moves exactly 1 cell at a time (grid-aligned)
            const newX = Math.max(0, Math.min(GRID_SIZE - 1, state.player.x + dx));
            const newY = Math.max(0, Math.min(GRID_SIZE - 1, state.player.y + dy));

            // Check for robot collision - player cannot move into a cell with a robot
            const isBlockedByRobot = state.robots.some(robot => robot.x === newX && robot.y === newY);
            if (isBlockedByRobot) {
                return state; // Stay in place
            }

            let newState = {
                ...state,
                player: { ...state.player, x: newX, y: newY, targetX: null, targetY: null },
            };

            // Try to pick up item at new location
            const pickupResult = tryPickupItem(newState.player, newState.grid, newState.items);
            if (pickupResult) {
                newState = {
                    ...newState,
                    player: { ...pickupResult.player, targetX: null, targetY: null },
                    items: pickupResult.items,
                };
            }

            // Check if player is at I/O port with an item (deliver)
            if (newState.player.carrying &&
                newState.player.x === IO_PORT.x &&
                newState.player.y === IO_PORT.y) {

                const carriedType = newState.player.carrying.type;
                // Find ANY matching order (player takes priority over robots)
                const matchingOrder = newState.orders.find(o => o.type === carriedType);

                if (matchingOrder) {
                    // Calculate XP with multiplier
                    const xpMultiplier = getXpMultiplier(newState.upgrades);
                    const xpGain = Math.floor(XP_PER_ORDER * xpMultiplier);

                    // Unclaim from robot if needed, then complete order
                    newState = {
                        ...newState,
                        player: { ...newState.player, carrying: null },
                        orders: newState.orders.filter(o => o.id !== matchingOrder.id),
                        xp: newState.xp + xpGain,
                        ordersCompleted: newState.ordersCompleted + 1,
                    };
                } else {
                    // No matching order, but still drop the item (it just doesn't count)
                    newState = {
                        ...newState,
                        player: { ...newState.player, carrying: null },
                    };
                }
            }

            return newState;
        });
    },

    selectUpgrade: (upgradeId: UpgradeId) => {
        set((state) => {
            if (!state.isSelectingUpgrade) return state;

            const newUpgrades = [...state.upgrades, upgradeId];
            const newState: GameState = {
                ...state,
                upgrades: newUpgrades,
                isSelectingUpgrade: false,
                pendingUpgrades: [],
            };

            // Apply upgrade effects
            newState.player = applyPlayerUpgrades(newState.player, newUpgrades);

            // Handle special upgrades
            if (upgradeId === 'extra_robot') {
                const newRobot = createRobot(newState.robots);
                newState.robots = [...newState.robots, newRobot];
            }

            return newState;
        });
    },

    setPlayerTarget: (x: number, y: number) => {
        set((state) => {
            if (state.isGameOver || state.isSelectingUpgrade) return state;
            return {
                ...state,
                player: { ...state.player, targetX: x, targetY: y },
            };
        });
    },

    clearPlayerTarget: () => {
        set((state) => ({
            ...state,
            player: { ...state.player, targetX: null, targetY: null },
        }));
    },

    restart: () => set({ ...initialState, grid: createInitialGrid(), robots: [createInitialRobot()] }),
}));

