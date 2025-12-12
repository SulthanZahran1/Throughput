import { create } from 'zustand';
import type {
    Grid,
    Crane,
    Order,
    Zone,
    ShiftStats,
    RetrievalMode,
    CraneMode,
    Item,
    ItemType,
} from '../types/game';
import { DEFAULT_CRANE_SPEED, ACTION_DELAY } from '../constants/config';

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

    // Core Loop
    tick: (dt: number) => void;

    // Crane Actions
    moveCraneTo: (x: number, y: number) => void;
    pickupFromIO: () => void;
    storeAt: (x: number, y: number) => void;
    retrieveFrom: (x: number, y: number) => void;
    deliverToIO: () => void;

    // Helpers
    addOrder: (order: Order) => void; // Keep for manual testing/levels
    generateOrder: () => void;

    // Editor
    addZone: (zone: Zone) => void;
    updateZone: (zoneId: string, updates: Partial<Zone>) => void;
    removeZone: (zoneId: string) => void;

    // Setup
    initializeGrid: (width: number, height: number, ioPort: { x: number; y: number }) => void;
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
    busyTimeRemaining: 0,
};

const ITEM_TYPES: ItemType[] = ['red', 'blue', 'green', 'yellow', 'purple'];

export const useGameStore = create<GameStore>((set, get) => ({
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

    tick: (dt) => {
        const state = get();
        if (state.isPaused) return;

        // Update times
        const newShiftTime = Math.max(0, state.shiftTime - dt);
        const newRealTime = state.realTime + dt;

        // Update crane busy time
        let newCrane = state.crane ? { ...state.crane } : null;
        if (newCrane && newCrane.busyTimeRemaining !== undefined && newCrane.busyTimeRemaining > 0) {
            newCrane.busyTimeRemaining -= dt;
            if (newCrane.busyTimeRemaining <= 0) {
                newCrane.busyTimeRemaining = 0;
                newCrane.state = 'idle';
                // Ensure position is snapped to target when movement finishes
                newCrane.x = newCrane.targetX;
                newCrane.y = newCrane.targetY;
            }
        }

        // Update orders (check deadlines)
        const newOrders = state.orders.map(o => {
            if (o.status === 'pending' && newRealTime > o.deadline) {
                return { ...o, status: 'failed' as const };
            }
            return o;
        });

        set({
            shiftTime: newShiftTime,
            realTime: newRealTime,
            crane: newCrane,
            orders: newOrders,
        });
    },

    moveCraneTo: (x, y) => {
        const { crane } = get();
        if (!crane || crane.state !== 'idle') return;

        const dist = Math.max(Math.abs(x - crane.x), Math.abs(y - crane.y));
        const duration = dist / crane.speed;

        set({
            crane: {
                ...crane,
                targetX: x,
                targetY: y,
                state: 'moving',
                busyTimeRemaining: duration,
                x: x,
                y: y,
            }
        });
    },

    pickupFromIO: () => {
        const { crane, grid, realTime } = get();
        if (!crane || !grid || crane.state !== 'idle' || crane.carrying) return;

        // Check if at IO
        if (crane.x !== grid.ioPort.x || crane.y !== grid.ioPort.y) return;

        const newItem: Item = {
            id: crypto.randomUUID(),
            type: ITEM_TYPES[Math.floor(Math.random() * 3)] as ItemType, // Limit to 3 types for now
            storedAt: realTime,
        };

        set({
            crane: {
                ...crane,
                state: 'retrieving',
                busyTimeRemaining: ACTION_DELAY,
                carrying: newItem,
            }
        });
    },

    storeAt: (x, y) => {
        const { crane, grid } = get();
        if (!crane || !grid || crane.state !== 'idle' || !crane.carrying) return;

        // Check if at location
        if (crane.x !== x || crane.y !== y) return;

        // Check if slot empty
        const key = `${x},${y}`;
        const slot = grid.slots.get(key);
        if (!slot || slot.state !== 'empty') return;

        // Update grid
        const newSlots = new Map(grid.slots);
        newSlots.set(key, { ...slot, state: 'occupied', item: crane.carrying });

        set({
            grid: { ...grid, slots: newSlots },
            crane: {
                ...crane,
                state: 'storing',
                busyTimeRemaining: ACTION_DELAY,
                carrying: null,
            }
        });
    },

    retrieveFrom: (x, y) => {
        const { crane, grid } = get();
        if (!crane || !grid || crane.state !== 'idle' || crane.carrying) return;

        // Check if at location
        if (crane.x !== x || crane.y !== y) return;

        // Check if slot has item
        const key = `${x},${y}`;
        const slot = grid.slots.get(key);
        if (!slot || slot.state !== 'occupied' || !slot.item) return;

        // Update grid
        const newSlots = new Map(grid.slots);
        newSlots.set(key, { ...slot, state: 'empty', item: null });

        set({
            grid: { ...grid, slots: newSlots },
            crane: {
                ...crane,
                state: 'retrieving',
                busyTimeRemaining: ACTION_DELAY,
                carrying: slot.item,
            }
        });
    },

    deliverToIO: () => {
        const { crane, grid, orders, stats, realTime } = get();
        if (!crane || !grid || crane.state !== 'idle' || !crane.carrying) return;

        // Check if at IO
        if (crane.x !== grid.ioPort.x || crane.y !== grid.ioPort.y) return;

        const item = crane.carrying;

        // Find matching order
        const matchingOrderIndex = orders.findIndex(o => o.status === 'pending' && o.itemType === item.type);

        let newOrders = [...orders];
        let newStats = { ...stats };

        if (matchingOrderIndex !== -1) {
            // Complete order
            newOrders[matchingOrderIndex] = {
                ...newOrders[matchingOrderIndex],
                status: 'completed',
                completedAt: realTime,
            };
            newStats.ordersCompleted++;
        } else {
            // No matching order? Just discard item?
            // For now, let's assume it's just discarded/delivered.
        }

        set({
            orders: newOrders,
            stats: newStats,
            crane: {
                ...crane,
                state: 'storing',
                busyTimeRemaining: ACTION_DELAY,
                carrying: null,
            }
        });
    },

    addOrder: (order) =>
        set((state) => ({ orders: [...state.orders, order] })),

    generateOrder: () => {
        const { realTime } = get();
        const type = ITEM_TYPES[Math.floor(Math.random() * 3)] as ItemType;
        const duration = 45; // 45 seconds deadline

        const newOrder: Order = {
            id: crypto.randomUUID(),
            itemType: type,
            createdAt: realTime,
            deadline: realTime + duration,
            status: 'pending',
        };

        set((state) => ({ orders: [...state.orders, newOrder] }));
    },

    // ... (keep existing zone helpers)
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
