import { create } from 'zustand';
import type { RNG } from '../engine/rng';
import type { HeldUpgrade, ShiftResult, RunResult } from '../engine/types';
import { createRng } from '../engine/rng';
import { getRandomModifier } from '../data/modifiers';
import { UPGRADES, arePrerequisitesMet, getUpgrade } from '../data/upgrades';

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
  setHp: (amount: number) => void;
  
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
  
  advanceToNextShift: () => set((state) => {
    const usedModifiers = state.nextModifier
      ? [...state.usedModifiers, state.nextModifier]
      : state.usedModifiers;
    const nextModifier = state.rng ? getRandomModifier(usedModifiers, state.rng).id : null;

    return {
      currentShift: state.currentShift + 1,
      currentModifier: state.nextModifier,
      nextModifier,
      usedModifiers,
      offeredCards: [],
    };
  }),
  
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

  setHp: (amount) => set((state) => ({
    hp: Math.max(0, Math.min(state.maxHp, amount)),
  })),
  
  pickUpgrade: (upgradeId) => {
    const upgrade = getUpgrade(upgradeId);
    set((state) => ({
      heldUpgrades: [...state.heldUpgrades, {
        id: upgradeId,
        name: upgrade?.name ?? upgradeId,
        rarity: upgrade?.rarity ?? 'common',
      }],
    }));
  },
  
  generateOffering: (availableUpgrades, count = 3) => {
    const state = get();
    if (!state.rng) return;
    
    const heldIds = new Set(state.heldUpgrades.map(u => u.id));
    const heldIdList = Array.from(heldIds);
    const eligible = availableUpgrades.filter(id => {
      if (heldIds.has(id)) return false;
      const upgrade = getUpgrade(id);
      return upgrade ? arePrerequisitesMet(upgrade, heldIdList) : false;
    });

    const common = eligible.filter(id => getUpgrade(id)?.rarity === 'common');
    const rare = eligible.filter(id => getUpgrade(id)?.rarity === 'rare');
    const epic = eligible.filter(id => getUpgrade(id)?.rarity === 'epic');
    const rarityWeights = state.currentShift >= 5
      ? { common: 40, rare: 35, epic: 25 }
      : { common: 60, rare: 30, epic: 10 };
    const offering: string[] = [];

    while (offering.length < count && offering.length < eligible.length) {
      const pickRarity = state.rng.nextWeighted([
        { item: 'common' as const, weight: common.some(id => !offering.includes(id)) ? rarityWeights.common : 0 },
        { item: 'rare' as const, weight: rare.some(id => !offering.includes(id)) ? rarityWeights.rare : 0 },
        { item: 'epic' as const, weight: epic.some(id => !offering.includes(id)) ? rarityWeights.epic : 0 },
      ]);
      const bucket = pickRarity === 'common' ? common : pickRarity === 'rare' ? rare : epic;
      const remaining = bucket.filter(id => !offering.includes(id));
      if (remaining.length === 0) break;
      offering.push(state.rng.nextItem(remaining));
    }

    if (offering.length < count) {
      for (const id of state.rng.shuffle([...eligible])) {
        if (!offering.includes(id)) offering.push(id);
        if (offering.length >= count) break;
      }
    }
    
    set({ offeredCards: offering });
  },
  
  useReroll: () => {
    const state = get();
    if (state.rerollsRemaining <= 0 || !state.rng) return false;

    set({ rerollsRemaining: state.rerollsRemaining - 1 });
    get().generateOffering(UPGRADES.map(upgrade => upgrade.id));
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
