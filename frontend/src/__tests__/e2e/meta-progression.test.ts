// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useMetaStore } from '../../store/metaStore';
import { checkAllMilestones } from '../../data/milestones';
import { getStartingUpgrades, UPGRADES } from '../../data/upgrades';
import type { RunResult, MetaState } from '../../engine/types';

/**
 * E2E: Meta Progression Tests
 *
 * Tests the persistent layer: crate balance, card unlocking,
 * run recording, and milestone triggering.
 *
 * Uses jsdom environment because useMetaStore uses localStorage
 * via zustand persist middleware.
 */
describe('Meta Progression (metaStore)', () => {
  beforeEach(() => {
    useMetaStore.getState().reset();
  });

  // Helper: create a minimal RunResult for testing
  function makeRunResult(overrides: Partial<RunResult> = {}): RunResult {
    return {
      seed: 12345,
      difficulty: 'normal',
      won: false,
      shiftsSurvived: 3,
      totalOrdersCompleted: 20,
      totalOrdersFailed: 5,
      finalHp: 3,
      maxHp: 5,
      score: 2000,
      upgradesHeld: [],
      ...overrides,
    };
  }

  // Helper: create a minimal MetaState for pure function tests
  function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
    return {
      deviceId: 'test-device',
      crates: 0,
      unlockedCards: [],
      milestones: [],
      bestScores: { normal: 0, hard: 0, brutal: 0 },
      bestShift: 0,
      totalRuns: 0,
      totalWins: 0,
      ...overrides,
    };
  }

  // =========================================================================
  // Initial State
  // =========================================================================

  describe('Initial State', () => {
    it('starts with 0 crates', () => {
      expect(useMetaStore.getState().crates).toBe(0);
    });

    it('starts with the correct starter upgrades unlocked', () => {
      const startingIds = getStartingUpgrades().map(u => u.id);
      const unlocked = useMetaStore.getState().getUnlockedPool();

      for (const id of startingIds) {
        expect(unlocked).toContain(id);
      }
    });

    it('does not start with any locked upgrades in the pool', () => {
      const lockedIds = UPGRADES.filter(u => u.unlockCost > 0).map(u => u.id);
      const unlocked = useMetaStore.getState().getUnlockedPool();

      for (const id of lockedIds) {
        expect(unlocked).not.toContain(id);
      }
    });

    it('starts with 0 runs and 0 wins', () => {
      const state = useMetaStore.getState();
      expect(state.totalRuns).toBe(0);
      expect(state.totalWins).toBe(0);
    });

    it('starts with no milestones completed', () => {
      expect(useMetaStore.getState().milestones).toHaveLength(0);
    });
  });

  // =========================================================================
  // Crate Economy
  // =========================================================================

  describe('Crate Economy', () => {
    it('addCrates increases the balance', () => {
      useMetaStore.getState().addCrates(10);
      expect(useMetaStore.getState().crates).toBe(10);
    });

    it('addCrates is cumulative', () => {
      useMetaStore.getState().addCrates(5);
      useMetaStore.getState().addCrates(3);
      expect(useMetaStore.getState().crates).toBe(8);
    });

    it('spendCrates deducts the balance and returns true', () => {
      useMetaStore.getState().addCrates(20);
      const success = useMetaStore.getState().spendCrates(8);

      expect(success).toBe(true);
      expect(useMetaStore.getState().crates).toBe(12);
    });

    it('spendCrates returns false and leaves balance unchanged when insufficient', () => {
      useMetaStore.getState().addCrates(5);
      const success = useMetaStore.getState().spendCrates(10);

      expect(success).toBe(false);
      expect(useMetaStore.getState().crates).toBe(5);
    });

    it('spendCrates returns false on exact zero balance', () => {
      // Balance is 0, try to spend anything
      const success = useMetaStore.getState().spendCrates(1);
      expect(success).toBe(false);
    });
  });

  // =========================================================================
  // Card Unlocking
  // =========================================================================

  describe('Card Unlocking', () => {
    it('unlockCard succeeds when crates are sufficient', () => {
      const upgrade = UPGRADES.find(u => u.unlockCost > 0)!;
      useMetaStore.getState().addCrates(upgrade.unlockCost + 50);

      const success = useMetaStore.getState().unlockCard(upgrade.id);
      expect(success).toBe(true);
      expect(useMetaStore.getState().unlockedCards).toContain(upgrade.id);
    });

    it('unlockCard deducts the correct crate cost', () => {
      // dual_command costs 100
      useMetaStore.getState().addCrates(200);
      useMetaStore.getState().unlockCard('dual_command');

      const dualCommandCost = UPGRADES.find(u => u.id === 'dual_command')!.unlockCost;
      expect(useMetaStore.getState().crates).toBe(200 - dualCommandCost);
    });

    it('unlockCard fails without enough crates', () => {
      useMetaStore.getState().addCrates(1); // way too few
      const success = useMetaStore.getState().unlockCard('dual_command');

      expect(success).toBe(false);
      expect(useMetaStore.getState().unlockedCards).not.toContain('dual_command');
      expect(useMetaStore.getState().crates).toBe(1); // unchanged
    });

    it('unlockCard fails for an already-owned card (no double spend)', () => {
      useMetaStore.getState().addCrates(500);
      useMetaStore.getState().unlockCard('dual_command');
      const cratesAfterFirst = useMetaStore.getState().crates;

      const success = useMetaStore.getState().unlockCard('dual_command'); // second attempt
      expect(success).toBe(false);
      expect(useMetaStore.getState().crates).toBe(cratesAfterFirst); // no deduction
    });

    it('unlockCard fails for an unknown card ID', () => {
      useMetaStore.getState().addCrates(999);
      const success = useMetaStore.getState().unlockCard('totally_fake_upgrade');
      expect(success).toBe(false);
    });

    it('newly unlocked card appears in getUnlockedPool', () => {
      useMetaStore.getState().addCrates(500);
      useMetaStore.getState().unlockCard('dual_command');

      expect(useMetaStore.getState().getUnlockedPool()).toContain('dual_command');
    });

    it('can unlock multiple cards in sequence', () => {
      useMetaStore.getState().addCrates(1000);
      useMetaStore.getState().unlockCard('dual_command'); // 100
      useMetaStore.getState().unlockCard('smart_sorting'); // 0 — it's a starter, should fail

      // dual_command should be unlocked
      expect(useMetaStore.getState().unlockedCards).toContain('dual_command');
    });
  });

  // =========================================================================
  // Run Recording
  // =========================================================================

  describe('Run Recording', () => {
    it('recordRun increments totalRuns', () => {
      useMetaStore.getState().recordRun(makeRunResult());
      expect(useMetaStore.getState().totalRuns).toBe(1);

      useMetaStore.getState().recordRun(makeRunResult());
      expect(useMetaStore.getState().totalRuns).toBe(2);
    });

    it('recordRun increments totalWins only for winning runs', () => {
      useMetaStore.getState().recordRun(makeRunResult({ won: false }));
      expect(useMetaStore.getState().totalWins).toBe(0);

      useMetaStore.getState().recordRun(makeRunResult({ won: true }));
      expect(useMetaStore.getState().totalWins).toBe(1);
    });

    it('recordRun updates bestShift when new high is reached', () => {
      useMetaStore.getState().recordRun(makeRunResult({ shiftsSurvived: 5 }));
      expect(useMetaStore.getState().bestShift).toBe(5);
    });

    it('recordRun does not lower bestShift', () => {
      useMetaStore.getState().recordRun(makeRunResult({ shiftsSurvived: 7 }));
      useMetaStore.getState().recordRun(makeRunResult({ shiftsSurvived: 2 }));
      expect(useMetaStore.getState().bestShift).toBe(7);
    });

    it('recordRun updates bestScores for the correct difficulty', () => {
      useMetaStore.getState().recordRun(makeRunResult({ score: 5000, difficulty: 'normal' }));
      useMetaStore.getState().recordRun(makeRunResult({ score: 3000, difficulty: 'hard' }));

      expect(useMetaStore.getState().bestScores.normal).toBe(5000);
      expect(useMetaStore.getState().bestScores.hard).toBe(3000);
      expect(useMetaStore.getState().bestScores.brutal).toBe(0); // untouched
    });

    it('recordRun does not lower bestScores', () => {
      useMetaStore.getState().recordRun(makeRunResult({ score: 8000, difficulty: 'normal' }));
      useMetaStore.getState().recordRun(makeRunResult({ score: 1000, difficulty: 'normal' }));
      expect(useMetaStore.getState().bestScores.normal).toBe(8000);
    });

    it('recordRun awards crates proportional to orders completed', () => {
      useMetaStore.getState().recordRun(makeRunResult({ totalOrdersCompleted: 10, won: false }));
      // 10 orders × 2 crates = 20 (× normal multiplier 1)
      expect(useMetaStore.getState().crates).toBe(20);
    });

    it('recordRun awards additional crates for winning', () => {
      useMetaStore.getState().recordRun(makeRunResult({ totalOrdersCompleted: 0, won: true }));
      // Only win bonus: 50 crates (× 1 multiplier)
      expect(useMetaStore.getState().crates).toBe(50);
    });

    it('hard difficulty gives more crates than normal for same performance', () => {
      useMetaStore.getState().recordRun(
        makeRunResult({ totalOrdersCompleted: 10, won: false, difficulty: 'normal' })
      );
      const normalCrates = useMetaStore.getState().crates;
      useMetaStore.getState().reset();

      useMetaStore.getState().recordRun(
        makeRunResult({ totalOrdersCompleted: 10, won: false, difficulty: 'hard' })
      );
      const hardCrates = useMetaStore.getState().crates;

      expect(hardCrates).toBeGreaterThan(normalCrates);
    });
  });

  // =========================================================================
  // Milestones (pure function tests via checkAllMilestones)
  // =========================================================================

  describe('Milestones', () => {
    it('first_run triggers on any completed run', () => {
      const meta = makeMeta();
      const triggered = checkAllMilestones(meta, makeRunResult({ won: false }));
      expect(triggered).toContain('first_run');
    });

    it('first_win triggers on a winning run', () => {
      const meta = makeMeta();
      const triggered = checkAllMilestones(meta, makeRunResult({ won: true }));
      expect(triggered).toContain('first_win');
    });

    it('first_win does NOT trigger on a losing run', () => {
      const meta = makeMeta();
      const triggered = checkAllMilestones(meta, makeRunResult({ won: false }));
      expect(triggered).not.toContain('first_win');
    });

    it('perfectionist triggers on a max-HP winning run', () => {
      const meta = makeMeta();
      const run = makeRunResult({ won: true, finalHp: 5, maxHp: 5 });
      const triggered = checkAllMilestones(meta, run);
      expect(triggered).toContain('perfectionist');
    });

    it('perfectionist does NOT trigger when HP is not at max', () => {
      const meta = makeMeta();
      const run = makeRunResult({ won: true, finalHp: 4, maxHp: 5 });
      const triggered = checkAllMilestones(meta, run);
      expect(triggered).not.toContain('perfectionist');
    });

    it('high_scorer triggers when score >= 10000', () => {
      const meta = makeMeta();
      const run = makeRunResult({ score: 10000 });
      const triggered = checkAllMilestones(meta, run);
      expect(triggered).toContain('high_scorer');
    });

    it('high_scorer does NOT trigger below 10000', () => {
      const meta = makeMeta();
      const run = makeRunResult({ score: 9999 });
      const triggered = checkAllMilestones(meta, run);
      expect(triggered).not.toContain('high_scorer');
    });

    it('already-completed milestones are not re-triggered', () => {
      const meta = makeMeta({
        milestones: ['first_run', 'first_win', 'perfectionist'],
      });
      const triggered = checkAllMilestones(meta, makeRunResult({ won: true, finalHp: 5, maxHp: 5 }));

      expect(triggered).not.toContain('first_run');
      expect(triggered).not.toContain('first_win');
      expect(triggered).not.toContain('perfectionist');
    });

    it('veteran triggers at 50 total runs', () => {
      const meta = makeMeta({ totalRuns: 50 });
      const triggered = checkAllMilestones(meta);
      expect(triggered).toContain('veteran');
    });

    it('veteran does NOT trigger before 50 total runs', () => {
      const meta = makeMeta({ totalRuns: 49 });
      const triggered = checkAllMilestones(meta);
      expect(triggered).not.toContain('veteran');
    });

    it('completeMilestone is idempotent — no duplicates', () => {
      useMetaStore.getState().completeMilestone('first_win');
      useMetaStore.getState().completeMilestone('first_win');

      const milestones = useMetaStore.getState().milestones;
      const count = milestones.filter(m => m === 'first_win').length;
      expect(count).toBe(1);
    });

    it('checkMilestones (store method) persists triggered milestones', () => {
      // Give the store state that would trigger first_run
      const triggered = useMetaStore.getState().checkMilestones(makeRunResult({ won: false }));

      expect(triggered).toContain('first_run');
      expect(useMetaStore.getState().milestones).toContain('first_run');
    });
  });

  // =========================================================================
  // syncFromBackend
  // =========================================================================

  describe('syncFromBackend', () => {
    it('takes the max crate balance (client wins if higher)', () => {
      useMetaStore.getState().addCrates(100);
      useMetaStore.getState().syncFromBackend({ crates: 50 });
      expect(useMetaStore.getState().crates).toBe(100); // client was higher
    });

    it('takes the backend crate balance when higher', () => {
      useMetaStore.getState().addCrates(50);
      useMetaStore.getState().syncFromBackend({ crates: 200 });
      expect(useMetaStore.getState().crates).toBe(200); // backend was higher
    });

    it('merges unlocked cards from backend without duplicates', () => {
      const startingIds = getStartingUpgrades().map(u => u.id);
      useMetaStore.getState().syncFromBackend({
        unlockedCards: ['dual_command', startingIds[0]],
      });
      const pool = useMetaStore.getState().getUnlockedPool();

      expect(pool).toContain('dual_command');
      // No duplicates
      const dupes = pool.filter(id => id === startingIds[0]);
      expect(dupes).toHaveLength(1);
    });

    it('takes the max bestShift from either source', () => {
      useMetaStore.getState().recordRun(makeRunResult({ shiftsSurvived: 5 }));
      useMetaStore.getState().syncFromBackend({ bestShift: 7 });
      expect(useMetaStore.getState().bestShift).toBe(7);
    });
  });
});
