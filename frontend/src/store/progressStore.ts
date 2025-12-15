import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LevelProgress, UserProgress, ShiftResult } from '../types/level';
import { LEVELS } from '../data/levels';

interface ProgressStore extends UserProgress {
    // Actions
    completeLevel: (result: ShiftResult) => void;
    isLevelUnlocked: (levelId: string) => boolean;
    hasFeature: (feature: string) => boolean;
    getLevelProgress: (levelId: string) => LevelProgress | null;
    resetProgress: () => void;
}

const initialProgress: UserProgress = {
    completedLevels: {},
    unlockedFeatures: [],
    currentLevel: null,
    totalStars: 0,
};

export const useProgressStore = create<ProgressStore>()(
    persist(
        (set, get) => ({
            ...initialProgress,

            completeLevel: (result: ShiftResult) => {
                const { completedLevels, unlockedFeatures, totalStars } = get();
                const existing = completedLevels[result.levelId];

                // Update level progress
                const newProgress: LevelProgress = {
                    levelId: result.levelId,
                    stars: Math.max(existing?.stars ?? 0, result.starsEarned),
                    bestJph: Math.max(existing?.bestJph ?? 0, result.jph),
                    bestCycleTime: existing?.bestCycleTime
                        ? Math.min(existing.bestCycleTime, result.avgCycleTime)
                        : result.avgCycleTime,
                    attempts: (existing?.attempts ?? 0) + 1,
                    completedAt: Date.now(),
                };

                // Calculate new total stars
                const oldStars = existing?.stars ?? 0;
                const newTotalStars = totalStars - oldStars + newProgress.stars;

                // Check for new feature unlock
                const newFeatures = [...unlockedFeatures];
                if (result.newUnlock && !newFeatures.includes(result.newUnlock)) {
                    newFeatures.push(result.newUnlock);
                }

                set({
                    completedLevels: {
                        ...completedLevels,
                        [result.levelId]: newProgress,
                    },
                    unlockedFeatures: newFeatures,
                    totalStars: newTotalStars,
                });
            },

            isLevelUnlocked: (levelId: string) => {
                const { completedLevels, totalStars } = get();

                // First level is always unlocked
                if (levelId === '1') return true;

                // Find level definition
                const level = LEVELS.find((l) => l.id === levelId);
                if (!level) return false;

                // Check star requirement
                const requiredStars = level.requiresStars ?? 0;
                if (totalStars < requiredStars) return false;

                // Check if previous level is completed
                const levelIndex = LEVELS.findIndex((l) => l.id === levelId);
                if (levelIndex <= 0) return true;

                const prevLevel = LEVELS[levelIndex - 1];
                const prevProgress = completedLevels[prevLevel.id];

                // Previous level must have at least 1 star
                return (prevProgress?.stars ?? 0) >= 1;
            },

            hasFeature: (feature: string) => {
                const { unlockedFeatures } = get();
                return unlockedFeatures.includes(feature);
            },

            getLevelProgress: (levelId: string) => {
                const { completedLevels } = get();
                return completedLevels[levelId] ?? null;
            },

            resetProgress: () => {
                set(initialProgress);
            },
        }),
        {
            name: 'throughput-progress',
        }
    )
);
