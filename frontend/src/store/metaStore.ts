import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MetaState, RunResult } from '../engine/types';
import { checkAllMilestones } from '../data/milestones';
import { UPGRADES, getStartingUpgrades } from '../data/upgrades';

// Generate or retrieve device ID
function getDeviceId(): string {
  const stored = localStorage.getItem('throughput_device_id');
  if (stored) return stored;
  
  const newId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('throughput_device_id', newId);
  return newId;
}

export interface MetaActions {
  // Crates
  addCrates: (amount: number) => void;
  spendCrates: (amount: number) => boolean; // Returns true if successful
  
  // Unlocks
  unlockCard: (cardId: string) => boolean;
  getUnlockedPool: () => string[];
  
  // Milestones
  completeMilestone: (milestoneId: string) => void;
  checkMilestones: (run?: RunResult) => string[]; // Returns newly completed
  
  // Stats
  recordRun: (result: RunResult) => void;
  
  // Sync
  syncFromBackend: (backendMeta: Partial<MetaState>) => void;
  getSyncData: () => MetaState;
  
  // Reset
  reset: () => void;
}

const initialState: MetaState = {
  deviceId: getDeviceId(),
  crates: 0,
  unlockedCards: getStartingUpgrades().map(u => u.id),
  milestones: [],
  bestScores: { normal: 0, hard: 0, brutal: 0 },
  bestShift: 0,
  totalRuns: 0,
  totalWins: 0,
};

export const useMetaStore = create<MetaState & MetaActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      addCrates: (amount) => set((state) => ({
        crates: state.crates + amount,
      })),
      
      spendCrates: (amount) => {
        const state = get();
        if (state.crates < amount) return false;
        
        set({ crates: state.crates - amount });
        return true;
      },
      
      unlockCard: (cardId) => {
        const state = get();
        if (state.unlockedCards.includes(cardId)) return false;
        
        const upgrade = UPGRADES.find(u => u.id === cardId);
        if (!upgrade) return false;
        
        if (state.crates < upgrade.unlockCost) return false;
        
        set({
          crates: state.crates - upgrade.unlockCost,
          unlockedCards: [...state.unlockedCards, cardId],
        });
        return true;
      },
      
      getUnlockedPool: () => {
        return get().unlockedCards;
      },
      
      completeMilestone: (milestoneId) => set((state) => {
        if (state.milestones.includes(milestoneId)) return state;
        return {
          milestones: [...state.milestones, milestoneId],
        };
      }),
      
      checkMilestones: (run) => {
        const state = get();
        const newlyCompleted = checkAllMilestones(state, run);
        
        for (const id of newlyCompleted) {
          get().completeMilestone(id);
        }
        
        return newlyCompleted;
      },
      
      recordRun: (result) => set((state) => {
        const newBestScores = { ...state.bestScores };
        if (result.score > newBestScores[result.difficulty]) {
          newBestScores[result.difficulty] = result.score;
        }
        
        return {
          crates: state.crates + calculateCrateReward(result),
          bestScores: newBestScores,
          bestShift: Math.max(state.bestShift, result.shiftsSurvived),
          totalRuns: state.totalRuns + 1,
          totalWins: state.totalWins + (result.won ? 1 : 0),
        };
      }),
      
      syncFromBackend: (backendMeta) => set((state) => {
        // Merge strategy: take max of each field
        return {
          ...state,
          crates: Math.max(state.crates, backendMeta.crates || 0),
          unlockedCards: [...new Set([...state.unlockedCards, ...(backendMeta.unlockedCards || [])])],
          milestones: [...new Set([...state.milestones, ...(backendMeta.milestones || [])])],
          bestScores: {
            normal: Math.max(state.bestScores.normal, backendMeta.bestScores?.normal || 0),
            hard: Math.max(state.bestScores.hard, backendMeta.bestScores?.hard || 0),
            brutal: Math.max(state.bestScores.brutal, backendMeta.bestScores?.brutal || 0),
          },
          bestShift: Math.max(state.bestShift, backendMeta.bestShift || 0),
          totalRuns: Math.max(state.totalRuns, backendMeta.totalRuns || 0),
          totalWins: Math.max(state.totalWins, backendMeta.totalWins || 0),
        };
      }),
      
      getSyncData: () => {
        const state = get();
        return {
          deviceId: state.deviceId,
          crates: state.crates,
          unlockedCards: state.unlockedCards,
          milestones: state.milestones,
          bestScores: state.bestScores,
          bestShift: state.bestShift,
          totalRuns: state.totalRuns,
          totalWins: state.totalWins,
        };
      },
      
      reset: () => set({ ...initialState, deviceId: getDeviceId() }),
    }),
    {
      name: 'throughput-meta',
      partialize: (state) => ({
        deviceId: state.deviceId,
        crates: state.crates,
        unlockedCards: state.unlockedCards,
        milestones: state.milestones,
        bestScores: state.bestScores,
        bestShift: state.bestShift,
        totalRuns: state.totalRuns,
        totalWins: state.totalWins,
      }),
    }
  )
);

function calculateCrateReward(result: RunResult): number {
  let reward = 0;
  
  // Base reward from completed orders
  reward += result.totalOrdersCompleted * 2;
  
  // Win bonus
  if (result.won) {
    reward += 50;
  }
  
  // Difficulty bonus
  const difficultyBonus = {
    normal: 1,
    hard: 1.5,
    brutal: 2,
  }[result.difficulty];
  
  return Math.floor(reward * difficultyBonus);
}
