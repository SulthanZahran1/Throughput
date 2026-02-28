import type { MilestoneDefinition, MetaState, RunResult } from '../engine/types';

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first_run',
    name: 'First Day',
    description: 'Complete your first run',
    check: (meta, run) => {
      void meta;
      return run !== undefined;
    },
  },
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Complete an 8-shift run',
    check: (meta, run) => {
      void meta;
      return run?.won === true;
    },
  },
  {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Score 10,000 points in a run',
    check: (meta, run) => {
      void meta;
      return (run?.score || 0) >= 10000;
    },
  },
  {
    id: 'speed_runner',
    name: 'Speed Runner',
    description: 'Complete a run in under 30 minutes',
    check: (meta, run) => {
      void meta;
      void run;
      // This would need actual time tracking
      return false;
    },
  },
  {
    id: 'hoarder',
    name: 'Hoarder',
    description: 'Collect 1000 total crates',
    check: (meta) => meta.crates >= 1000,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 50 runs',
    check: (meta) => meta.totalRuns >= 50,
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 10 runs',
    check: (meta) => meta.totalWins >= 10,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete a run with max HP',
    check: (meta, run) => {
      void meta;
      return run?.won === true && run?.finalHp === run?.maxHp;
    },
  },
  {
    id: 'hard_won',
    name: 'Hard Won',
    description: 'Win a run on Hard difficulty',
    check: (meta, run) => {
      void meta;
      return run?.won === true && run?.difficulty === 'hard';
    },
  },
  {
    id: 'brutal_victory',
    name: 'Brutal Victory',
    description: 'Win a run on Brutal difficulty',
    check: (meta, run) => {
      void meta;
      return run?.won === true && run?.difficulty === 'brutal';
    },
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Unlock all upgrades',
    check: (meta) => {
      void meta;
      // Total unlockable upgrades / check if all unlocked
      return false; // Would need to compare against total
    },
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Reach shift 5 with only 1 HP remaining',
    check: () => {
      // Would need run tracking
      return false;
    },
  },
];

/**
 * Check if a milestone is completed
 */
export function checkMilestone(
  milestone: MilestoneDefinition,
  meta: MetaState,
  run?: RunResult
): boolean {
  return milestone.check(meta, run);
}

/**
 * Check all milestones and return newly completed ones
 */
export function checkAllMilestones(
  meta: MetaState,
  run?: RunResult
): string[] {
  const completed: string[] = [];
  
  for (const milestone of MILESTONES) {
    if (!meta.milestones.includes(milestone.id)) {
      if (checkMilestone(milestone, meta, run)) {
        completed.push(milestone.id);
      }
    }
  }
  
  return completed;
}

/**
 * Get milestone by ID
 */
export function getMilestone(id: string): MilestoneDefinition | undefined {
  return MILESTONES.find(m => m.id === id);
}
