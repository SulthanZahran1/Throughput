import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../../store/runStore';
import type { ShiftResult } from '../../engine/types';

/**
 * E2E: Run Lifecycle Tests
 *
 * Tests the complete run state machine through the runStore:
 * startRun → shift → applyShiftResult → damageHp → advanceToNextShift
 *            → pickUpgrade → (repeat) → endRun
 *
 * No simulation engine, no UI — pure store state machine.
 */
describe('Run Lifecycle (runStore)', () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  // Helper to create a minimal ShiftResult for store tests
  function makeShiftResult(overrides: Partial<ShiftResult> = {}): ShiftResult {
    return {
      shiftNumber: 1,
      completed: true,
      ordersCompleted: 10,
      ordersFailed: 1,
      vipOrdersCompleted: 0,
      hpLost: 1,
      hpRecovered: 0,
      score: 1000,
      events: [],
      ...overrides,
    };
  }

  // =========================================================================
  // startRun
  // =========================================================================

  describe('startRun', () => {
    it('initializes a run with correct defaults', () => {
      useRunStore.getState().startRun(12345, 'normal');
      const state = useRunStore.getState();

      expect(state.isActive).toBe(true);
      expect(state.seed).toBe(12345);
      expect(state.difficulty).toBe('normal');
      expect(state.currentShift).toBe(1);
      expect(state.heldUpgrades).toHaveLength(0);
      expect(state.shiftResults).toHaveLength(0);
      expect(state.totalOrdersCompleted).toBe(0);
      expect(state.totalOrdersFailed).toBe(0);
      expect(state.rng).not.toBeNull();
    });

    it('starts with full HP', () => {
      useRunStore.getState().startRun(12345, 'normal');
      const { hp, maxHp } = useRunStore.getState();
      expect(hp).toBe(maxHp);
      expect(hp).toBeGreaterThan(0);
    });

    it('generates a nextModifier on start', () => {
      useRunStore.getState().startRun(12345, 'normal');
      expect(useRunStore.getState().nextModifier).not.toBeNull();
    });

    it('same seed produces the same first modifier (deterministic)', () => {
      useRunStore.getState().startRun(42, 'normal');
      const mod1 = useRunStore.getState().nextModifier;

      useRunStore.getState().startRun(42, 'normal');
      const mod2 = useRunStore.getState().nextModifier;

      expect(mod1).toBe(mod2);
    });

    it('resets an in-progress run when called again', () => {
      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().pickUpgrade('afterburners');
      useRunStore.getState().damageHp(3);

      // Start a fresh run — should wipe prior state
      useRunStore.getState().startRun(99, 'hard');
      const state = useRunStore.getState();

      expect(state.heldUpgrades).toHaveLength(0);
      expect(state.hp).toBe(state.maxHp);
      expect(state.difficulty).toBe('hard');
    });
  });

  // =========================================================================
  // HP Management
  // =========================================================================

  describe('HP Management', () => {
    beforeEach(() => {
      useRunStore.getState().startRun(12345, 'normal');
    });

    it('damageHp reduces HP by the given amount', () => {
      const { maxHp } = useRunStore.getState();
      useRunStore.getState().damageHp(2);
      expect(useRunStore.getState().hp).toBe(maxHp - 2);
    });

    it('damageHp returns false when HP remains above 0', () => {
      const dead = useRunStore.getState().damageHp(1);
      expect(dead).toBe(false);
      expect(useRunStore.getState().hp).toBeGreaterThan(0);
    });

    it('damageHp returns true when HP hits exactly 0', () => {
      const { maxHp } = useRunStore.getState();
      const dead = useRunStore.getState().damageHp(maxHp);
      expect(dead).toBe(true);
      expect(useRunStore.getState().hp).toBe(0);
    });

    it('damageHp clamps HP to 0 (no negative HP)', () => {
      useRunStore.getState().damageHp(9999);
      expect(useRunStore.getState().hp).toBe(0);
    });

    it('damage accumulates correctly across multiple calls', () => {
      const { maxHp } = useRunStore.getState();
      useRunStore.getState().damageHp(1);
      useRunStore.getState().damageHp(1);
      useRunStore.getState().damageHp(1);
      expect(useRunStore.getState().hp).toBe(maxHp - 3);
    });

    it('healHp restores HP', () => {
      useRunStore.getState().damageHp(3);
      useRunStore.getState().healHp(2);
      const { hp, maxHp } = useRunStore.getState();
      expect(hp).toBe(maxHp - 1);
    });

    it('healHp is capped at maxHp (no overheal)', () => {
      useRunStore.getState().damageHp(1);
      useRunStore.getState().healHp(9999);
      const { hp, maxHp } = useRunStore.getState();
      expect(hp).toBe(maxHp);
    });
  });

  // =========================================================================
  // Upgrade System
  // =========================================================================

  describe('Upgrade System', () => {
    beforeEach(() => {
      useRunStore.getState().startRun(12345, 'normal');
    });

    it('pickUpgrade adds the upgrade to heldUpgrades', () => {
      useRunStore.getState().pickUpgrade('afterburners');
      const { heldUpgrades } = useRunStore.getState();
      expect(heldUpgrades).toHaveLength(1);
      expect(heldUpgrades[0].id).toBe('afterburners');
    });

    it('can accumulate multiple upgrades across shifts', () => {
      useRunStore.getState().pickUpgrade('afterburners');
      useRunStore.getState().pickUpgrade('smart_sorting');
      useRunStore.getState().pickUpgrade('vip_clients');
      expect(useRunStore.getState().heldUpgrades).toHaveLength(3);
    });

    it('generateOffering produces the requested number of cards', () => {
      const pool = ['afterburners', 'smart_sorting', 'vip_clients', 'dual_command', 'overclocked'];
      useRunStore.getState().generateOffering(pool, 3);
      expect(useRunStore.getState().offeredCards).toHaveLength(3);
    });

    it('generateOffering excludes already-held upgrades', () => {
      useRunStore.getState().pickUpgrade('afterburners');

      const pool = ['afterburners', 'smart_sorting', 'vip_clients'];
      useRunStore.getState().generateOffering(pool, 3);

      expect(useRunStore.getState().offeredCards).not.toContain('afterburners');
    });

    it('generateOffering handles pool smaller than requested count', () => {
      useRunStore.getState().pickUpgrade('afterburners');
      useRunStore.getState().pickUpgrade('smart_sorting');

      // Only vip_clients remains in the pool
      const pool = ['afterburners', 'smart_sorting', 'vip_clients'];
      useRunStore.getState().generateOffering(pool, 3);

      const offered = useRunStore.getState().offeredCards;
      expect(offered).toHaveLength(1);
      expect(offered[0]).toBe('vip_clients');
    });

    it('offered cards are cleared when advancing to next shift', () => {
      const pool = ['afterburners', 'smart_sorting', 'vip_clients'];
      useRunStore.getState().generateOffering(pool, 3);
      expect(useRunStore.getState().offeredCards).toHaveLength(3);

      useRunStore.getState().advanceToNextShift();
      expect(useRunStore.getState().offeredCards).toHaveLength(0);
    });
  });

  // =========================================================================
  // Shift Progression
  // =========================================================================

  describe('Shift Progression', () => {
    beforeEach(() => {
      useRunStore.getState().startRun(12345, 'normal');
    });

    it('advanceToNextShift increments currentShift', () => {
      useRunStore.getState().advanceToNextShift();
      expect(useRunStore.getState().currentShift).toBe(2);
    });

    it('advanceToNextShift rotates modifiers (next becomes current)', () => {
      const nextMod = useRunStore.getState().nextModifier;
      useRunStore.getState().advanceToNextShift();
      expect(useRunStore.getState().currentModifier).toBe(nextMod);
    });

    it('applyShiftResult accumulates order counts across shifts', () => {
      const shift1 = makeShiftResult({ shiftNumber: 1, ordersCompleted: 8, ordersFailed: 2 });
      const shift2 = makeShiftResult({ shiftNumber: 2, ordersCompleted: 12, ordersFailed: 0 });

      useRunStore.getState().applyShiftResult(shift1);
      useRunStore.getState().applyShiftResult(shift2);

      const state = useRunStore.getState();
      expect(state.totalOrdersCompleted).toBe(20); // 8 + 12
      expect(state.totalOrdersFailed).toBe(2);     // 2 + 0
      expect(state.shiftResults).toHaveLength(2);
    });

    it('can advance through all 8 shifts', () => {
      for (let i = 0; i < 7; i++) {
        useRunStore.getState().advanceToNextShift();
      }
      expect(useRunStore.getState().currentShift).toBe(8);
    });
  });

  // =========================================================================
  // Run End
  // =========================================================================

  describe('Run End', () => {
    it('endRun returns null when no run is active', () => {
      const result = useRunStore.getState().endRun(true);
      expect(result).toBeNull();
    });

    it('endRun sets isActive to false', () => {
      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().endRun(false);
      expect(useRunStore.getState().isActive).toBe(false);
    });

    it('endRun at shift 8 with success=true produces won=true', () => {
      useRunStore.getState().startRun(12345, 'normal');
      for (let i = 0; i < 7; i++) useRunStore.getState().advanceToNextShift();

      const result = useRunStore.getState().endRun(true);
      expect(result!.won).toBe(true);
      expect(result!.shiftsSurvived).toBe(8);
    });

    it('endRun before shift 8 with success=true still produces won=false', () => {
      useRunStore.getState().startRun(12345, 'normal');
      // Still on shift 1

      const result = useRunStore.getState().endRun(true);
      expect(result!.won).toBe(false);
    });

    it('endRun with success=false produces won=false regardless of shift', () => {
      useRunStore.getState().startRun(12345, 'normal');
      for (let i = 0; i < 7; i++) useRunStore.getState().advanceToNextShift();

      const result = useRunStore.getState().endRun(false);
      expect(result!.won).toBe(false);
    });

    it('RunResult captures correct HP, upgrades, and totals', () => {
      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().damageHp(2);
      useRunStore.getState().pickUpgrade('afterburners');
      useRunStore.getState().applyShiftResult(makeShiftResult({ ordersCompleted: 5, ordersFailed: 2 }));

      const result = useRunStore.getState().endRun(false);

      expect(result!.finalHp).toBe(result!.maxHp - 2);
      expect(result!.upgradesHeld).toContain('afterburners');
      expect(result!.totalOrdersCompleted).toBe(5);
      expect(result!.totalOrdersFailed).toBe(2);
      expect(result!.difficulty).toBe('normal');
      expect(result!.seed).toBe(12345);
    });

    it('score increases on higher difficulty', () => {
      const shiftResult = makeShiftResult({ score: 1000, ordersCompleted: 10 });

      // Normal run
      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().applyShiftResult(shiftResult);
      const normalResult = useRunStore.getState().endRun(false);

      // Hard run (startRun resets state)
      useRunStore.getState().startRun(12345, 'hard');
      useRunStore.getState().applyShiftResult(shiftResult);
      const hardResult = useRunStore.getState().endRun(false);

      // Brutal run
      useRunStore.getState().startRun(12345, 'brutal');
      useRunStore.getState().applyShiftResult(shiftResult);
      const brutalResult = useRunStore.getState().endRun(false);

      expect(hardResult!.score).toBeGreaterThan(normalResult!.score);
      expect(brutalResult!.score).toBeGreaterThan(hardResult!.score);
    });

    it('score includes HP bonus (surviving with more HP = higher score)', () => {
      const shiftResult = makeShiftResult({ score: 1000 });

      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().applyShiftResult(shiftResult);
      const fullHpResult = useRunStore.getState().endRun(false);

      useRunStore.getState().startRun(12345, 'normal');
      useRunStore.getState().damageHp(3);
      useRunStore.getState().applyShiftResult(shiftResult);
      const lowHpResult = useRunStore.getState().endRun(false);

      expect(fullHpResult!.score).toBeGreaterThan(lowHpResult!.score);
    });
  });

  // =========================================================================
  // Critical Game Scenarios
  // =========================================================================

  describe('Critical Game Scenarios', () => {
    it('HP=0 run-over path: damageHp signals death, endRun records it', () => {
      useRunStore.getState().startRun(12345, 'normal');

      useRunStore.getState().applyShiftResult(makeShiftResult({ ordersFailed: 99 }));
      const dead = useRunStore.getState().damageHp(99);

      expect(dead).toBe(true);
      expect(useRunStore.getState().hp).toBe(0);

      const result = useRunStore.getState().endRun(false);
      expect(result!.won).toBe(false);
      expect(result!.finalHp).toBe(0);
    });

    it('full winning run state machine: 8 shifts, pick upgrades each time', () => {
      useRunStore.getState().startRun(12345, 'normal');

      for (let shift = 1; shift <= 8; shift++) {
        // Simulate a clean shift (no failures)
        useRunStore.getState().applyShiftResult(
          makeShiftResult({ shiftNumber: shift, ordersCompleted: 10, ordersFailed: 0 })
        );

        if (shift < 8) {
          // Pick an upgrade between shifts (use the same one for simplicity)
          useRunStore.getState().pickUpgrade('afterburners');
          useRunStore.getState().advanceToNextShift();
        }
      }

      expect(useRunStore.getState().currentShift).toBe(8);
      expect(useRunStore.getState().hp).toBe(useRunStore.getState().maxHp);
      expect(useRunStore.getState().heldUpgrades).toHaveLength(7);

      const result = useRunStore.getState().endRun(true);
      expect(result!.won).toBe(true);
      expect(result!.totalOrdersCompleted).toBe(80); // 10 * 8
      expect(result!.totalOrdersFailed).toBe(0);
    });

    it('death by attrition: HP whittled down across multiple shifts', () => {
      useRunStore.getState().startRun(12345, 'normal');
      const { maxHp } = useRunStore.getState();

      // Each shift costs 1 HP — should die on shift maxHp+1
      let dead = false;
      for (let shift = 1; shift <= maxHp + 2 && !dead; shift++) {
        useRunStore.getState().applyShiftResult(
          makeShiftResult({ shiftNumber: shift, ordersFailed: 1 })
        );
        dead = useRunStore.getState().damageHp(1);
        if (!dead) useRunStore.getState().advanceToNextShift();
      }

      expect(dead).toBe(true);
      expect(useRunStore.getState().hp).toBe(0);
    });
  });
});
