import { create } from 'zustand';
import type { GameState, GridSlot, UpgradeId, Robot } from '../types/game';
import { INITIAL_GRID_SIZE, getIOPort } from '../constants/config';
import { tickGame } from '../engine/simulation';
import { createRobot } from '../engine/robots';
import { applyPlayerUpgrades } from '../engine/player';

interface GameActions {
    tick: (delta: number) => void;
    setPlayerTarget: (x: number, y: number) => void;
    clearPlayerTarget: () => void;
    selectUpgrade: (upgradeId: UpgradeId) => void;
    restart: () => void;
    addFloatingXp: (amount: number, x: number, y: number) => void;
}

const createInitialGrid = (size: number): GridSlot[][] => {
    const grid: GridSlot[][] = [];
    for (let y = 0; y < size; y++) {
        const row: GridSlot[] = [];
        for (let x = 0; x < size; x++) {
            row.push({ x, y, item: null });
        }
        grid.push(row);
    }
    return grid;
};

// Create initial robot at I/O port
const createInitialRobot = (size: number): Robot => {
    const ioPort = getIOPort(size);
    return {
        id: 'robot-1-initial',
        x: ioPort.x + 2,
        y: ioPort.y,
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

const getInitialState = (size: number = INITIAL_GRID_SIZE): GameState => ({
    player: {
        x: Math.floor(size / 2) - 2,
        y: Math.floor(size / 2) - 2,
        carrying: null,
        speedMultiplier: 1.0,
        pickupRadius: 0,
        targetX: null,
        targetY: null,
        moveProgress: 0,
    },
    grid: createInitialGrid(size),
    items: [],
    orders: [],
    robots: [createInitialRobot(size)],
    gridSize: size,
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
    floatingXp: [],
});

export const useGameStore = create<GameState & GameActions>((set) => ({
    ...getInitialState(),

    tick: (delta: number) => {
        set((state) => {
            const newState = tickGame(state, delta);

            // If gridSize changed, regenerate grid array
            if (newState.gridSize !== state.gridSize) {
                newState.grid = createInitialGrid(newState.gridSize);
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
                const newRobot = createRobot(newState.robots, newState.gridSize);
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
                player: { ...state.player, targetX: x, targetY: y, path: [] },
            };
        });
    },

    clearPlayerTarget: () => {
        set((state) => ({
            ...state,
            player: { ...state.player, targetX: null, targetY: null, path: [] },
        }));
    },

    addFloatingXp: (amount: number, x: number, y: number) => {
        set((state) => ({
            ...state,
            floatingXp: [
                ...state.floatingXp,
                {
                    id: `xp-${Date.now()}-${Math.random()}`,
                    amount,
                    x,
                    y,
                    createdAt: state.runTime,
                },
            ],
        }));
    },

    restart: () => set(getInitialState()),
}));


