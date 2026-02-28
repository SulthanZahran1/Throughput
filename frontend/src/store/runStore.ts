import { create } from 'zustand';
import type { RNG } from '../engine/rng';
import type { HeldUpgrade, ShiftResult, RunResult } from '../engine/types';
import { createRng } from '../engine/rng';
import { getRandomModifier } from '../data/modifiers';

export interface RunState {
  // Run status
  isActive: boolean;
  seed: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  rng: RNG | null;
  
  // Progress
  currentShift: number;
  
  // HP
  hp: number;
  maxHp: number;
  
  // Upgrades
  heldUpgrades: HeldUpgrade[];
  
  // Modifiers
  currentModifier: string | null;
  nextModifier: string | null;
  usedModifiers: string[];
  
  // Card offering
  offeredCards: string[];
  rerollsRemaining: number;
  
  // Results
  shiftResults: ShiftResult[];
  totalOrdersCompleted: number;
  totalOrdersFailed: number;
}

export interface RunActions {
  // Run lifecycle
  startRun: (seed: number, difficulty: 'normal' | 'hard' | 'brutal') => void;
  endRun: (success: boolean) => RunResult | null;
  
  // Shift progression
  advanceToNextShift: () => void;
  applyShiftResult: (result: ShiftResult) => void;
  
  // HP management
  damageHp: (amount: number) => boolean; // Returns true if HP reached 0
  healHp: (amount: number) => void;
  
  // Upgrades
  pickUpgrade: (upgradeId: string) => void;
  generateOffering: (availableUpgrades: string[], count?: number) => void;
  useReroll: () => boolean; // Returns true if reroll was used
  
  // Modifiers
  setNextModifier: (modifierId: string) => void;
  applyModifier: () => void;
  
  // Reset
  reset: () => void;
}

const INITIAL_HP = 5;
const MAX_REROLLS = 2;

const initialState: RunState = {
  isActive: false,
  seed: 0,
  difficulty: 'normal',
  rng: null,
  currentShift: 1,
  hp: INITIAL_HP,
  maxHp: INITIAL_HP,
  heldUpgrades: [],
  currentModifier: null,
  nextModifier: null,
  usedModifiers: [],
  offeredCards: [],
  rerollsRemaining: MAX_REROLLS,
  shiftResults: [],
  totalOrdersCompleted: 0,
  totalOrdersFailed: 0,
};

export const useRunStore = create<RunState & RunActions>((set, get) => ({
  ...initialState,
  
  startRun: (seed, difficulty) => {
    const rng = createRng(seed);
    
    // Generate first modifier
    const firstModifier = getRandomModifier([], rng);
    
    set({
      ...initialState,
      isActive: true,
      seed,
      difficulty,
      rng,
      nextModifier: firstModifier.id,
    });
  },
  
  endRun: (success) => {
    const state = get();
    if (!state.isActive) return null;
    
    const result: RunResult = {
      seed: state.seed,
      difficulty: state.difficulty,
      won: success && state.currentShift >= 8,
      shiftsSurvived: state.currentShift,
      totalOrdersCompleted: state.totalOrdersCompleted,
      totalOrdersFailed: state.totalOrdersFailed,
      finalHp: state.hp,
      maxHp: state.maxHp,
      score: calculateRunScore(state),
      upgradesHeld: state.heldUpgrades.map(u => u.id),
    };
    
    set({ isActive: false });
    return result;
  },
  
  advanceToNextShift: () => set((state) => ({
    currentShift: state.currentShift + 1,
    currentModifier: state.nextModifier,
    nextModifier: null,
    offeredCards: [],
  })),
  
  applyShiftResult: (result) => set((state) => ({
    shiftResults: [...state.shiftResults, result],
    totalOrdersCompleted: state.totalOrdersCompleted + result.ordersCompleted,
    totalOrdersFailed: state.totalOrdersFailed + result.ordersFailed,
  })),
  
  damageHp: (amount) => {
    const state = get();
    const newHp = Math.max(0, state.hp - amount);
    set({ hp: newHp });
    return newHp === 0;
  },
  
  healHp: (amount) => set((state) => ({
    hp: Math.min(state.maxHp, state.hp + amount),
  })),
  
  pickUpgrade: (upgradeId) => set((state) => ({
    heldUpgrades: [...state.heldUpgrades, {
      id: upgradeId,
      name: upgradeId, // Will be resolved from data
      rarity: 'common', // Will be resolved from data
    }],
  })),
  
  generateOffering: (availableUpgrades, count = 3) => {
    const state = get();
    if (!state.rng) return;
    
    // Filter out already held upgrades and pick random ones
    const heldIds = new Set(state.heldUpgrades.map(u => u.id));
    const pool = availableUpgrades.filter(id => !heldIds.has(id));
    
    const shuffled = state.rng.shuffle([...pool]);
    const offering = shuffled.slice(0, count);
    
    set({ offeredCards: offering });
  },
  
  useReroll: () => {
    const state = get();
    if (state.rerollsRemaining <= 0 || !state.rng) return false;
    
    set({ rerollsRemaining: state.rerollsRemaining - 1 });
    return true;
  },
  
  setNextModifier: (modifierId) => set({ nextModifier: modifierId }),
  
  applyModifier: () => set((state) => ({
    currentModifier: state.nextModifier,
    usedModifiers: state.nextModifier 
      ? [...state.usedModifiers, state.nextModifier]
      : state.usedModifiers,
    nextModifier: null,
  })),
  
  reset: () => set(initialState),
}));

function calculateRunScore(state: RunState): number {
  let score = 0;
  
  // Shift results
  for (const shift of state.shiftResults) {
    score += shift.score;
  }
  
  // Completion bonus
  if (state.currentShift >= 8 && state.hp > 0) {
    score += 1000;
  }
  
  // HP bonus
  score += state.hp * 100;
  
  // Difficulty multiplier
  const multiplier = {
    normal: 1,
    hard: 1.5,
    brutal: 2,
  }[state.difficulty];
  
  return Math.floor(score * multiplier);
}
