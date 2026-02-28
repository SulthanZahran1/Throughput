import { create } from 'zustand';
import type { SimulationContext, ShiftParameters, SimulationEvent } from '../engine/types';

export interface GameState {
  // Simulation state
  context: SimulationContext | null;
  
  // Shift info
  shiftNumber: number;
  shiftParameters: ShiftParameters | null;
  
  // Time tracking
  isPaused: boolean;
  lastTickTime: number;
  
  // Events from last tick
  lastEvents: SimulationEvent[];
  
  // Visual state (for animations)
  pendingAnimations: SimulationEvent[];
}

export interface GameActions {
  // Initialization
  initializeShift: (params: ShiftParameters, context: SimulationContext) => void;
  
  // Simulation updates
  setContext: (context: SimulationContext) => void;
  setSimulationState: (updates: Partial<SimulationContext>) => void;
  addEvents: (events: SimulationEvent[]) => void;
  
  // Time control
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setLastTickTime: (time: number) => void;
  
  // Animation handling
  clearPendingAnimations: () => void;
  
  // Reset
  reset: () => void;
}

const initialState: GameState = {
  context: null,
  shiftNumber: 1,
  shiftParameters: null,
  isPaused: false,
  lastTickTime: 0,
  lastEvents: [],
  pendingAnimations: [],
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,
  
  initializeShift: (params, context) => set({
    shiftParameters: params,
    context,
    shiftNumber: params.shiftNumber,
    isPaused: false,
    lastTickTime: performance.now(),
    lastEvents: [],
    pendingAnimations: [],
  }),
  
  setContext: (context) => set({ context }),
  
  setSimulationState: (updates) => set((state) => ({
    context: state.context ? { ...state.context, ...updates } : null,
  })),
  
  addEvents: (events) => set((state) => ({
    lastEvents: events,
    pendingAnimations: [...state.pendingAnimations, ...events],
  })),
  
  setPaused: (paused) => set({ isPaused: paused }),
  
  togglePaused: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setLastTickTime: (time) => set({ lastTickTime: time }),
  
  clearPendingAnimations: () => set({ pendingAnimations: [] }),
  
  reset: () => set(initialState),
}));
