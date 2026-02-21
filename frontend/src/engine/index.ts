/**
 * Engine Public API
 * 
 * Framework-agnostic game engine for Throughput.
 * All functions are pure and have no React/Zustand dependencies.
 */

// Types from types.ts
export type {
    // Core types
    Slot,
    SlotState,
    Grid,
    Item,
    ItemType,
    Crane,
    CraneState,
    CraneMission,
    MissionType,
    Order,
    OrderStatus,
    Zone,
    RetrievalMode,
    CraneMode,
    ShiftStats,
    SimulationState,
    SimulationContext,
    OrderWave,
} from './types';

// Types from other modules
export type { RetrievalTarget } from './retrieval';
export type { CraneAction, CraneTickResult, MoveOptions } from './crane';
export type { TickResult, SimulationAction } from './simulation';

// Types from orders.ts
export type { OrderUpdateResult, OrderGenerationResult } from './orders';

// Main simulation
export {
    tickSimulation,
    findBestStorageSlot,
    findBestRetrieval,
} from './simulation';

// Storage logic
export { findBestStorageSlot as findStorageSlot } from './storage';

// Retrieval logic
export { findBestRetrieval as findRetrieval } from './retrieval';

// Crane logic
export {
    tickCrane,
    moveCrane,
    startStoreMission,
    startRetrieveMission,
    createCrane,
    calculateTravelTime,
} from './crane';

// Order logic
export {
    updateOrderDeadlines,
    generateOrders,
} from './orders';
