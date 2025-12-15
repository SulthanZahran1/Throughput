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
import type { LevelDefinition, ShiftResult } from '../types/level';
import { DEFAULT_CRANE_SPEED, ACTION_DELAY, MAX_FAILED_ORDERS } from '../constants/config';
import { findBestStorageSlot, findBestRetrieval } from '../engine/decision';
import { logger } from '../utils/logger';

interface GameStore {
    // Level
    levelId: string | null;
    currentLevel: LevelDefinition | null;
    shiftDuration: number;
    lastOrderTime: number; // Track when last order was spawned

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
    loadLevel: (level: LevelDefinition) => void;
    getShiftResult: () => ShiftResult | null;

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
    editingZoneId: string | null;
    setEditingZoneId: (zoneId: string | null) => void;
    addZone: (zone: Zone) => void;
    updateZone: (zoneId: string, updates: Partial<Zone>) => void;
    removeZone: (zoneId: string) => void;
    paintCell: (x: number, y: number, mode: 'add' | 'remove') => void;

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
    state: 'IDLE',
    mission: null,
    carrying: null,
    speed: DEFAULT_CRANE_SPEED,
    busyTimeRemaining: 0,
};

const ITEM_TYPES: ItemType[] = ['red', 'blue', 'green', 'yellow', 'purple'];

export const useGameStore = create<GameStore>((set, get) => ({
    // Initial state
    levelId: null,
    currentLevel: null,
    shiftDuration: 0,
    lastOrderTime: -999, // Start negative so first order spawns immediately
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

    // Actions
    setLevel: (levelId) => set({ levelId }),
    setPaused: (paused) => set({ isPaused: paused }),
    setRetrievalMode: (mode) => set({ retrievalMode: mode }),
    setCraneMode: (mode) => set({ craneMode: mode }),

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
            lastOrderTime: -999, // Start negative so first order spawns immediately
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

    tick: (dt) => {
        const state = get();
        if (state.isPaused) return;

        // Update times
        const newShiftTime = Math.max(0, state.shiftTime - dt);
        const newRealTime = state.realTime + dt;

        // Update orders (check deadlines)
        let newOrders = state.orders.map(o => {
            if (o.status === 'pending' && newRealTime > o.deadline) {
                return { ...o, status: 'failed' as const };
            }
            return o;
        });

        // Count newly failed orders
        const justFailed = newOrders.filter(
            (o, i) => o.status === 'failed' && state.orders[i]?.status === 'pending'
        ).length;

        // --- AUTO ORDER GENERATION ---
        let newLastOrderTime = state.lastOrderTime;
        if (state.currentLevel && newShiftTime > 0) {
            const level = state.currentLevel;
            // Find active wave for current time
            const activeWave = level.orderSchedule.find(
                wave => newRealTime >= wave.startTime && newRealTime < wave.endTime
            );

            if (activeWave && activeWave.ordersPerMinute > 0) {
                const orderInterval = 60 / activeWave.ordersPerMinute;
                if (newRealTime - newLastOrderTime >= orderInterval) {
                    // Generate order based on wave
                    const totalWeight = activeWave.itemDistribution.reduce((sum, d) => sum + d.weight, 0);
                    let rand = Math.random() * totalWeight;
                    let selectedType: ItemType = activeWave.itemDistribution[0]?.type || 'red';
                    for (const dist of activeWave.itemDistribution) {
                        rand -= dist.weight;
                        if (rand <= 0) {
                            selectedType = dist.type;
                            break;
                        }
                    }

                    const timerDuration = activeWave.timerRange.min +
                        Math.random() * (activeWave.timerRange.max - activeWave.timerRange.min);

                    const newOrder: Order = {
                        id: crypto.randomUUID(),
                        itemType: selectedType,
                        createdAt: newRealTime,
                        deadline: newRealTime + timerDuration,
                        status: 'pending',
                    };
                    newOrders = [...newOrders, newOrder];
                    newLastOrderTime = newRealTime;
                }
            }
        }

        // --- FSM LOGIC ---
        const nextCrane = state.crane ? { ...state.crane } : null;
        let nextGrid = state.grid;
        let nextStats = { ...state.stats, ordersFailed: state.stats.ordersFailed + justFailed };
        let nextOrdersState = newOrders;

        if (nextCrane && nextGrid) {
            // 1. Process Busy Time (TRANSFERRING or MOVING)
            if (nextCrane.busyTimeRemaining > 0) {
                nextCrane.busyTimeRemaining -= dt;

                // If moving, update position visually
                if (nextCrane.state === 'MOVING') {
                    // We can interpolate here if we want smooth updates in state, 
                    // but React component handles animation.
                    // However, we must ensure we don't overshoot target if we rely on x/y for logic.
                    // For now, let's just wait until busyTime <= 0 to snap.
                }

                if (nextCrane.busyTimeRemaining <= 0) {
                    nextCrane.busyTimeRemaining = 0;

                    // Action complete!
                    if (nextCrane.state === 'MOVING') {
                        // Arrived
                        nextCrane.x = nextCrane.mission?.targetX ?? nextCrane.x;
                        nextCrane.y = nextCrane.mission?.targetY ?? nextCrane.y;

                        // Transition to TRANSFERRING
                        nextCrane.state = 'TRANSFERRING';
                        nextCrane.busyTimeRemaining = ACTION_DELAY;
                    } else if (nextCrane.state === 'TRANSFERRING') {
                        // Transfer complete
                        // Perform the actual logic (Store/Retrieve/Pickup/Drop)

                        logger.fsm('TRANSFERRING complete', {
                            mission: nextCrane.mission?.type,
                            pos: { x: nextCrane.x, y: nextCrane.y },
                            target: { x: nextCrane.mission?.targetX, y: nextCrane.mission?.targetY },
                            ioPort: { x: nextGrid.ioPort.x, y: nextGrid.ioPort.y },
                            carrying: nextCrane.carrying?.type || 'none',
                        });

                        if (nextCrane.mission?.type === 'STORE') {
                            // We are either at IO (Pickup) or at Slot (Drop)
                            const atIO = nextCrane.x === nextGrid.ioPort.x && nextCrane.y === nextGrid.ioPort.y;
                            const atTarget = nextCrane.x === nextCrane.mission.targetX && nextCrane.y === nextCrane.mission.targetY;

                            if (atIO && !nextCrane.carrying) {
                                // PICKUP FROM IO - use level's item types
                                const levelItemTypes = state.currentLevel?.itemTypes || ITEM_TYPES.slice(0, 3);
                                const newItem: Item = {
                                    id: crypto.randomUUID(),
                                    type: levelItemTypes[Math.floor(Math.random() * levelItemTypes.length)] as ItemType,
                                    storedAt: newRealTime,
                                };
                                nextCrane.carrying = newItem;
                                // Now move to drop
                                const targetSlot = findBestStorageSlot(newItem, nextGrid, state.zones);
                                if (targetSlot) {
                                    nextCrane.mission = { ...nextCrane.mission, targetX: targetSlot.x, targetY: targetSlot.y };
                                    const dist = Math.max(Math.abs(targetSlot.x - nextCrane.x), Math.abs(targetSlot.y - nextCrane.y));
                                    nextCrane.state = 'MOVING';
                                    nextCrane.busyTimeRemaining = dist / nextCrane.speed;
                                } else {
                                    // No slot found? Stuck holding item.
                                    // Go to IDLE with item?
                                    nextCrane.state = 'IDLE';
                                    nextCrane.mission = null;
                                }
                            } else if (atTarget && nextCrane.carrying) {
                                // DROP AT SLOT
                                logger.fsm('STORE: Dropping at target', { x: nextCrane.x, y: nextCrane.y });
                                const key = `${nextCrane.x},${nextCrane.y}`;
                                const slot = nextGrid.slots.get(key);
                                if (slot && slot.state === 'empty') {
                                    const newSlots = new Map(nextGrid.slots);
                                    newSlots.set(key, { ...slot, state: 'occupied', item: nextCrane.carrying });
                                    nextGrid = { ...nextGrid, slots: newSlots };
                                    nextCrane.carrying = null;
                                    nextCrane.state = 'IDLE';
                                    nextCrane.mission = null;
                                } else {
                                    // Slot taken? Find another slot
                                    logger.warn('FSM', 'STORE: Target slot not empty, re-evaluating');
                                    nextCrane.state = 'IDLE';
                                    nextCrane.mission = null;
                                }
                            } else {
                                // Unexpected state - at IO with item, or elsewhere
                                logger.warn('FSM', 'STORE: Unexpected state', { atIO, atTarget, carrying: !!nextCrane.carrying });
                                nextCrane.state = 'IDLE';
                                nextCrane.mission = null;
                            }
                        } else if (nextCrane.mission?.type === 'RETRIEVE') {
                            // We are either at Slot (Pickup) or at IO (Drop)
                            if (nextCrane.x === nextGrid.ioPort.x && nextCrane.y === nextGrid.ioPort.y && nextCrane.carrying) {
                                // DROP AT IO (Deliver)
                                const item = nextCrane.carrying;
                                const matchingOrderIndex = nextOrdersState.findIndex(o => o.status === 'pending' && o.itemType === item.type);

                                if (matchingOrderIndex !== -1) {
                                    const completedOrder = {
                                        ...nextOrdersState[matchingOrderIndex],
                                        status: 'completed' as const,
                                        completedAt: newRealTime,
                                    };
                                    nextOrdersState = [...nextOrdersState];
                                    nextOrdersState[matchingOrderIndex] = completedOrder;
                                    nextStats = { ...nextStats, ordersCompleted: nextStats.ordersCompleted + 1 };
                                }

                                nextCrane.carrying = null;
                                nextCrane.state = 'IDLE';
                                nextCrane.mission = null;
                            } else {
                                // PICKUP FROM SLOT
                                const key = `${nextCrane.x},${nextCrane.y}`;
                                const slot = nextGrid.slots.get(key);
                                if (slot && slot.state === 'occupied' && slot.item) {
                                    const newSlots = new Map(nextGrid.slots);
                                    newSlots.set(key, { ...slot, state: 'empty', item: null });
                                    nextGrid = { ...nextGrid, slots: newSlots };
                                    nextCrane.carrying = slot.item;

                                    // Move to IO
                                    nextCrane.mission = { ...nextCrane.mission!, targetX: nextGrid.ioPort.x, targetY: nextGrid.ioPort.y };
                                    const dist = Math.max(Math.abs(nextGrid.ioPort.x - nextCrane.x), Math.abs(nextGrid.ioPort.y - nextCrane.y));
                                    nextCrane.state = 'MOVING';
                                    nextCrane.busyTimeRemaining = dist / nextCrane.speed;
                                } else {
                                    // Failed to pickup?
                                    nextCrane.state = 'IDLE';
                                    nextCrane.mission = null;
                                }
                            }
                        } else {
                            // Unknown mission or manual move
                            nextCrane.state = 'IDLE';
                            nextCrane.mission = null;
                        }
                    }
                }
            }

            // 2. Process IDLE (Brain)
            if (nextCrane.state === 'IDLE') {
                // Priority 1: Retrieve (if orders pending)
                const retrievalTarget = findBestRetrieval(nextOrdersState, nextGrid, state.retrievalMode, nextCrane);

                if (retrievalTarget) {
                    // Start Retrieval Mission
                    const { slot } = retrievalTarget;
                    nextCrane.mission = {
                        type: 'RETRIEVE',
                        targetX: slot.x,
                        targetY: slot.y,
                        item: slot.item!,
                    };

                    // If already there?
                    if (nextCrane.x === slot.x && nextCrane.y === slot.y) {
                        nextCrane.state = 'TRANSFERRING';
                        nextCrane.busyTimeRemaining = ACTION_DELAY;
                    } else {
                        const dist = Math.max(Math.abs(slot.x - nextCrane.x), Math.abs(slot.y - nextCrane.y));
                        nextCrane.state = 'MOVING';
                        nextCrane.busyTimeRemaining = dist / nextCrane.speed;
                    }
                } else {
                    // Priority 2: Store (Stock up)
                    // Only if we are at IO? Or should we go to IO?
                    // Let's go to IO if we are idle.

                    // Check if we can store (grid not full)
                    // For now, just go to IO and try to pickup

                    if (nextCrane.x === nextGrid.ioPort.x && nextCrane.y === nextGrid.ioPort.y) {
                        // We are at IO. Start Store Mission.
                        nextCrane.mission = {
                            type: 'STORE',
                            targetX: nextGrid.ioPort.x, // Placeholder, will update after pickup
                            targetY: nextGrid.ioPort.y,
                            item: { id: 'pending', type: 'red', storedAt: 0 } as Item // Placeholder
                        };
                        nextCrane.state = 'TRANSFERRING';
                        nextCrane.busyTimeRemaining = ACTION_DELAY;
                    } else {
                        // Move to IO
                        const dist = Math.max(Math.abs(nextGrid.ioPort.x - nextCrane.x), Math.abs(nextGrid.ioPort.y - nextCrane.y));
                        nextCrane.state = 'MOVING';
                        nextCrane.busyTimeRemaining = dist / nextCrane.speed;
                        // We don't have a mission yet really, but we are moving to start one.
                        // Let's set a partial mission? Or just move?
                        // Let's say we are starting a STORE mission.
                        nextCrane.mission = {
                            type: 'STORE',
                            targetX: nextGrid.ioPort.x,
                            targetY: nextGrid.ioPort.y,
                            item: { id: 'pending', type: 'red', storedAt: 0 } as Item
                        };
                    }
                }
            }
        }

        set({
            shiftTime: newShiftTime,
            realTime: newRealTime,
            lastOrderTime: newLastOrderTime,
            crane: nextCrane,
            orders: nextOrdersState,
            grid: nextGrid,
            stats: nextStats,
        });
    },

    moveCraneTo: (x, y) => {
        const { crane } = get();
        if (!crane) return;

        const dist = Math.max(Math.abs(x - crane.x), Math.abs(y - crane.y));
        const duration = dist / crane.speed;

        set({
            crane: {
                ...crane,
                state: 'MOVING',
                busyTimeRemaining: duration,
                mission: null, // Manual move has no mission
            }
        });
    },

    pickupFromIO: () => { console.warn('Manual pickup deprecated in FSM'); },
    storeAt: (_x, _y) => { console.warn('Manual store deprecated in FSM'); },
    retrieveFrom: (_x, _y) => { console.warn('Manual retrieve deprecated in FSM'); },
    deliverToIO: () => { console.warn('Manual deliver deprecated in FSM'); },

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
    setEditingZoneId: (zoneId) => set({ editingZoneId: zoneId }),

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
        // Create a new Set to ensure immutability
        targetZone.cells = new Set(targetZone.cells);

        if (mode === 'add') {
            targetZone.cells.add(cellKey);
        } else {
            targetZone.cells.delete(cellKey);
        }
        newZones[zoneIndex] = targetZone;

        // Recalculate slot.zoneId (highest priority zone wins)
        // We need to check ALL zones for this cell to find the winner
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
                crane: { ...initialCrane, x: ioPort.x, y: ioPort.y, state: 'IDLE', mission: null },
            };
        }),

    resetGame: () =>
        set({
            levelId: null,
            currentLevel: null,
            shiftDuration: 0,
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
