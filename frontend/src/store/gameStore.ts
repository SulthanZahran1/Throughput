import { create } from 'zustand';
import type {
    Grid,
    Crane,
    Order,
    Zone,
    ShiftStats,
} from '../types/game';
import type { LevelDefinition, ShiftResult } from '../types/level';
import { DEFAULT_CRANE_SPEED, MAX_FAILED_ORDERS } from '../constants/config';

interface GameStore {
    // Level
    levelId: string | null;
    currentLevel: LevelDefinition | null;
    shiftDuration: number;
    lastOrderTime: number;

    // Time
    shiftTime: number;
    realTime: number;
    isPaused: boolean;

    // Entities
    grid: Grid | null;
    crane: Crane | null;
    orders: Order[];
    zones: Zone[];

    // Settings
    retrievalMode: 'fifo' | 'deadline' | 'nearest';
    craneMode: 'single' | 'dual';

    // Stats
    stats: ShiftStats;

    // Editor
    editingZoneId: string | null;

    // Actions - State setters
    setPaused: (paused: boolean) => void;
    setRetrievalMode: (mode: 'fifo' | 'deadline' | 'nearest') => void;
    setCraneMode: (mode: 'single' | 'dual') => void;
    setEditingZoneId: (zoneId: string | null) => void;

    // Actions - State updates (used by engine/hooks)
    setSimulationState: (updates: Partial<Omit<GameStore, 
        'setPaused' | 'setRetrievalMode' | 'setCraneMode' | 'setEditingZoneId' |
        'setSimulationState' | 'loadLevel' | 'getShiftResult' | 'addZone' |
        'updateZone' | 'removeZone' | 'paintCell' | 'resetGame'
    >>) => void;

    // Actions - Level management
    loadLevel: (level: LevelDefinition) => void;
    getShiftResult: () => ShiftResult | null;
    resetGame: () => void;

    // Actions - Zone management
    addZone: (zone: Zone) => void;
    updateZone: (zoneId: string, updates: Partial<Zone>) => void;
    removeZone: (zoneId: string) => void;
    paintCell: (x: number, y: number, mode: 'add' | 'remove') => void;
}

const initialStats: ShiftStats = {
    ordersCompleted: 0,
    ordersFailed: 0,
    totalCycleTime: 0,
    totalTravelDistance: 0,
};

const initialCrane: Crane = {
    x: 0,
    y: 0,
    state: 'IDLE',
    mission: null,
    carrying: null,
    speed: DEFAULT_CRANE_SPEED,
    busyTimeRemaining: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
    // Initial state
    levelId: null,
    currentLevel: null,
    shiftDuration: 0,
    lastOrderTime: -999,
    shiftTime: 0,
    realTime: 0,
    isPaused: true,
    grid: null,
    crane: null,
    orders: [],
    zones: [],
    editingZoneId: null,
    retrievalMode: 'fifo',
    craneMode: 'single',
    stats: { ...initialStats },

    // Simple setters
    setPaused: (paused) => set({ isPaused: paused }),
    setRetrievalMode: (mode) => set({ retrievalMode: mode }),
    setCraneMode: (mode) => set({ craneMode: mode }),
    setEditingZoneId: (zoneId) => set({ editingZoneId: zoneId }),

    // Bulk state update (used by useGameLoop after engine tick)
    setSimulationState: (updates) => set((state) => ({ ...state, ...updates })),

    loadLevel: (level: LevelDefinition) => {
        // Create grid
        const slots = new Map();
        for (let x = 0; x < level.gridWidth; x++) {
            for (let y = 0; y < level.gridHeight; y++) {
                const isBlocked = level.blockedCells?.some(
                    (c) => c.x === x && c.y === y
                );
                slots.set(`${x},${y}`, {
                    x,
                    y,
                    state: isBlocked ? 'blocked' : 'empty',
                    item: null,
                    zoneId: null,
                });
            }
        }

        // Place initial inventory
        if (level.initialInventory) {
            for (const inv of level.initialInventory) {
                const key = `${inv.slot.x},${inv.slot.y}`;
                const slot = slots.get(key);
                if (slot && slot.state === 'empty') {
                    slots.set(key, {
                        ...slot,
                        state: 'occupied',
                        item: {
                            id: crypto.randomUUID(),
                            type: inv.type,
                            storedAt: 0,
                        },
                    });
                }
            }
        }

        const grid = {
            width: level.gridWidth,
            height: level.gridHeight,
            slots,
            ioPort: level.ioPortPosition,
        };

        const crane = {
            ...initialCrane,
            x: level.ioPortPosition.x,
            y: level.ioPortPosition.y,
            state: 'IDLE' as const,
            mission: null,
        };

        set({
            levelId: level.id,
            currentLevel: level,
            shiftDuration: level.shiftDuration,
            shiftTime: level.shiftDuration,
            lastOrderTime: -999,
            realTime: 0,
            isPaused: true,
            grid,
            crane,
            orders: [],
            zones: [],
            stats: { ...initialStats },
        });
    },

    getShiftResult: () => {
        const state = get();
        if (!state.currentLevel) return null;

        const level = state.currentLevel;
        const isLose = state.stats.ordersFailed >= MAX_FAILED_ORDERS;
        const isWin = !isLose && state.shiftTime <= 0;

        if (!isWin && !isLose) return null;

        const avgCycleTime =
            state.stats.ordersCompleted > 0
                ? state.stats.totalCycleTime / state.stats.ordersCompleted
                : 0;

        const duration = state.realTime;
        const jph = duration > 0 ? (state.stats.ordersCompleted / duration) * 3600 : 0;

        // Calculate stars
        let starsEarned = 0;
        if (isWin) {
            const checkThreshold = (t: typeof level.starThresholds.one): boolean => {
                switch (t.metric) {
                    case 'survival':
                        return true;
                    case 'jph':
                        return jph >= t.value;
                    case 'cycle_time':
                        return avgCycleTime <= t.value;
                    case 'orders_completed':
                        return state.stats.ordersCompleted >= t.value;
                    default:
                        return false;
                }
            };

            if (checkThreshold(level.starThresholds.one)) starsEarned = 1;
            if (starsEarned >= 1 && checkThreshold(level.starThresholds.two)) starsEarned = 2;
            if (starsEarned >= 2 && checkThreshold(level.starThresholds.three)) starsEarned = 3;
        }

        return {
            levelId: level.id,
            outcome: isWin ? 'win' : 'lose',
            ordersCompleted: state.stats.ordersCompleted,
            ordersFailed: state.stats.ordersFailed,
            avgCycleTime,
            jph,
            duration,
            starsEarned,
            newUnlock: isWin && starsEarned >= 1 ? level.unlocksFeature : undefined,
        } as ShiftResult;
    },

    // Zone management
    addZone: (zone) =>
        set((state) => ({ zones: [...state.zones, zone] })),

    updateZone: (zoneId, updates) =>
        set((state) => ({
            zones: state.zones.map((z) =>
                z.id === zoneId ? { ...z, ...updates } : z
            ),
        })),

    removeZone: (zoneId) =>
        set((state) => ({
            zones: state.zones.filter((z) => z.id !== zoneId),
        })),

    paintCell: (x, y, mode) => {
        const { editingZoneId, zones, grid } = get();
        if (!editingZoneId || !grid) return;

        const cellKey = `${x},${y}`;
        const zoneIndex = zones.findIndex(z => z.id === editingZoneId);
        if (zoneIndex === -1) return;

        const newZones = [...zones];
        const targetZone = { ...newZones[zoneIndex] };
        targetZone.cells = new Set(targetZone.cells);

        if (mode === 'add') {
            targetZone.cells.add(cellKey);
        } else {
            targetZone.cells.delete(cellKey);
        }
        newZones[zoneIndex] = targetZone;

        // Recalculate slot.zoneId (highest priority zone wins)
        let highestPri = -1;
        let winnerId: string | null = null;

        for (const z of newZones) {
            if (z.cells.has(cellKey)) {
                if (z.priority > highestPri) {
                    highestPri = z.priority;
                    winnerId = z.id;
                }
            }
        }

        // Update grid slot
        const newSlots = new Map(grid.slots);
        const slot = newSlots.get(cellKey);
        if (slot) {
            newSlots.set(cellKey, { ...slot, zoneId: winnerId });
        }

        set({
            zones: newZones,
            grid: { ...grid, slots: newSlots }
        });
    },

    resetGame: () =>
        set({
            levelId: null,
            currentLevel: null,
            shiftDuration: 0,
            lastOrderTime: -999,
            shiftTime: 0,
            realTime: 0,
            isPaused: true,
            grid: null,
            crane: null,
            orders: [],
            zones: [],
            stats: { ...initialStats },
        }),
}));
