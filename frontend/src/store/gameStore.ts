import { create } from 'zustand';
import type {
    Grid,
    Crane,
    Order,
    Zone,
    ShiftStats,
    RetrievalMode,
    CraneMode,
} from '../types/game';
import { DEFAULT_CRANE_SPEED } from '../constants/config';

interface GameStore {
    // Level
    levelId: string | null;

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
    retrievalMode: RetrievalMode;
    craneMode: CraneMode;

    // Stats
    stats: ShiftStats;

    // Actions
    setLevel: (levelId: string) => void;
    setPaused: (paused: boolean) => void;
    setRetrievalMode: (mode: RetrievalMode) => void;
    setCraneMode: (mode: CraneMode) => void;
    updateShiftTime: (delta: number) => void;
    updateRealTime: (delta: number) => void;
    addOrder: (order: Order) => void;
    updateOrder: (orderId: string, updates: Partial<Order>) => void;
    addZone: (zone: Zone) => void;
    updateZone: (zoneId: string, updates: Partial<Zone>) => void;
    removeZone: (zoneId: string) => void;
    initializeGrid: (width: number, height: number, ioPort: { x: number; y: number }) => void;
    moveCraneTo: (x: number, y: number) => void;
    updateCranePosition: (x: number, y: number) => void;
    setCraneState: (state: 'idle' | 'moving' | 'storing' | 'retrieving') => void;
    resetGame: () => void;
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
    targetX: 0,
    targetY: 0,
    state: 'idle',
    carrying: null,
    speed: DEFAULT_CRANE_SPEED,
};

export const useGameStore = create<GameStore>((set) => ({
    // Initial state
    levelId: null,
    shiftTime: 0,
    realTime: 0,
    isPaused: true,
    grid: null,
    crane: null,
    orders: [],
    zones: [],
    retrievalMode: 'fifo',
    craneMode: 'single',
    stats: { ...initialStats },

    // Actions
    setLevel: (levelId) => set({ levelId }),

    setPaused: (paused) => set({ isPaused: paused }),

    setRetrievalMode: (mode) => set({ retrievalMode: mode }),

    setCraneMode: (mode) => set({ craneMode: mode }),

    updateShiftTime: (delta) =>
        set((state) => ({ shiftTime: Math.max(0, state.shiftTime - delta) })),

    updateRealTime: (delta) =>
        set((state) => ({ realTime: state.realTime + delta })),

    addOrder: (order) =>
        set((state) => ({ orders: [...state.orders, order] })),

    updateOrder: (orderId, updates) =>
        set((state) => ({
            orders: state.orders.map((o) =>
                o.id === orderId ? { ...o, ...updates } : o
            ),
        })),

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

    initializeGrid: (width, height, ioPort) =>
        set(() => {
            const slots = new Map();
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    slots.set(`${x},${y}`, {
                        x,
                        y,
                        state: 'empty',
                        item: null,
                        zoneId: null,
                    });
                }
            }
            return {
                grid: { width, height, slots, ioPort },
                crane: { ...initialCrane, x: ioPort.x, y: ioPort.y, targetX: ioPort.x, targetY: ioPort.y },
            };
        }),

    moveCraneTo: (x, y) =>
        set((state) => {
            if (!state.crane) return {};
            return {
                crane: {
                    ...state.crane,
                    targetX: x,
                    targetY: y,
                    x: x,
                    y: y,
                    state: 'moving',
                },
            };
        }),

    updateCranePosition: (x, y) =>
        set((state) => {
            if (!state.crane) return {};
            const isAtTarget = x === state.crane.targetX && y === state.crane.targetY;
            return {
                crane: {
                    ...state.crane,
                    x,
                    y,
                    state: isAtTarget ? 'idle' : state.crane.state,
                },
            };
        }),

    setCraneState: (craneState) =>
        set((state) => {
            if (!state.crane) return {};
            return {
                crane: {
                    ...state.crane,
                    state: craneState,
                },
            };
        }),

    resetGame: () =>
        set({
            levelId: null,
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
