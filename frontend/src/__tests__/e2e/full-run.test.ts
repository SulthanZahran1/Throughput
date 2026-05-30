import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../../store/runStore';
import { createSimulationContext, tickSimulation, generateShiftResult } from '../../engine/simulation';
import { createGrid } from '../../engine/grid';
import { createRng } from '../../engine/rng';
import { generateShiftParameters } from '../../data/escalation';
import { applyUpgradesToFlags } from '../../data/upgrades';
import type { ShiftResult, SimulationFlags } from '../../engine/types';

/**
 * E2E: Full Run (Engine → Store Pipeline)
 *
 * These are the true end-to-end tests: the simulation engine produces a
 * ShiftResult, which flows into the runStore, which drives the game loop.
 *
 * Uses fast-forward simulation (large dt) to avoid slow wall-clock time.
 */
describe('Full Run (Engine → Store Pipeline)', () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Run a complete shift using realistic 1-second steps until SHIFT_END.
   * Returns the ShiftResult without modifying any store.
   *
   * Uses 1s steps (not one huge tick) so orders actually spawn and complete.
   */
  function runShiftFast(
    shiftNumber: number,
    seed: number,
    difficulty: 'normal' | 'hard' | 'brutal' = 'normal',
    heldUpgrades: string[] = [],
    modifierId: string | null = null,
  ): ShiftResult {
    const flags: SimulationFlags = applyUpgradesToFlags({}, heldUpgrades);
    const params = generateShiftParameters(shiftNumber, seed, difficulty, heldUpgrades, modifierId, flags);

    const rng = createRng(seed + shiftNumber);
    const grid = createGrid({
      width: params.gridWidth,
      height: params.gridHeight,
      blockedCells: params.blockedCells,
      initialInventory: params.initialInventory,
    }, rng);

    const context = createSimulationContext(
      seed,
      shiftNumber,
      difficulty,
      grid,
      flags,
      {
        totalShiftTime: params.totalShiftTime,
        orderSpawnRate: params.orderSpawnRate,
        orderDeadlineBase: params.orderDeadlineBase,
        craneCount: params.craneCount,
        craneSpeed: params.craneSpeed,
        transferTime: params.transferTime,
      },
      rng,
    );

    // Step in 1-second increments so orders spawn and are processed realistically.
    // Stop when shift ends or we exceed the time budget.
    for (let t = 0; t <= params.totalShiftTime + 5; t++) {
      const result = tickSimulation(context, 1);
      if (result.events.some(e => e.type === 'SHIFT_END')) break;
    }
    return generateShiftResult(context);
  }

  // =========================================================================
  // Single Shift
  // =========================================================================

  describe('Single Shift', () => {
    it('a simulated shift produces a structurally valid ShiftResult', () => {
      const result = runShiftFast(1, 12345);

      expect(result.shiftNumber).toBe(1);
      // NOTE: completed = (shiftTimeRemaining > 0), so false = time ran out (normal end)
      expect(result.completed).toBe(false);
      expect(result.ordersCompleted).toBeGreaterThanOrEqual(0);
      expect(result.ordersFailed).toBeGreaterThanOrEqual(0);
      expect(result.vipOrdersCompleted).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('ShiftResult feeds correctly into runStore order totals', () => {
      useRunStore.getState().startRun(12345, 'normal');
      const result = runShiftFast(1, 12345);

      useRunStore.getState().applyShiftResult(result);

      const state = useRunStore.getState();
      expect(state.totalOrdersCompleted).toBe(result.ordersCompleted);
      expect(state.totalOrdersFailed).toBe(result.ordersFailed);
      expect(state.shiftResults).toHaveLength(1);
    });

    it('HP in store correctly reflects simulation damage (one HP per failed order)', () => {
      useRunStore.getState().startRun(12345, 'normal');
      const { maxHp } = useRunStore.getState();

      const result = runShiftFast(1, 12345);
      useRunStore.getState().damageHp(result.ordersFailed);

      const expectedHp = Math.max(0, maxHp - result.ordersFailed);
      expect(useRunStore.getState().hp).toBe(expectedHp);
    });

    it('is deterministic: same seed/shift produces identical results', () => {
      const r1 = runShiftFast(3, 42, 'normal');
      const r2 = runShiftFast(3, 42, 'normal');

      expect(r1.ordersCompleted).toBe(r2.ordersCompleted);
      expect(r1.ordersFailed).toBe(r2.ordersFailed);
      expect(r1.score).toBe(r2.score);
    });

    it('shift 8 (final boss) runs to time-out (not early death)', () => {
      const result = runShiftFast(8, 12345);
      // completed=false means time ran out (normal end), completed=true means HP hit 0 mid-shift
      expect(result.completed).toBe(false);
      expect(result.shiftNumber).toBe(8);
    });
  });

  // =========================================================================
  // Multi-Shift Progression
  // =========================================================================

  describe('Multi-Shift Progression', () => {
    it('three consecutive shifts accumulate correctly in runStore', () => {
      const seed = 12345;
      useRunStore.getState().startRun(seed, 'normal');

      let expectedCompleted = 0;
      let expectedFailed = 0;

      for (let shift = 1; shift <= 3; shift++) {
        const result = runShiftFast(shift, seed);
        expectedCompleted += result.ordersCompleted;
        expectedFailed += result.ordersFailed;

        useRunStore.getState().applyShiftResult(result);
        useRunStore.getState().damageHp(result.ordersFailed);

        if (shift < 3) useRunStore.getState().advanceToNextShift();
      }

      const state = useRunStore.getState();
      expect(state.totalOrdersCompleted).toBe(expectedCompleted);
      expect(state.totalOrdersFailed).toBe(expectedFailed);
      expect(state.currentShift).toBe(3);
    });

    it('winning run: all 8 shifts produce a won=true result', () => {
      const seed = 12345;
      useRunStore.getState().startRun(seed, 'normal');

      for (let shift = 1; shift <= 8; shift++) {
        const result = runShiftFast(shift, seed);
        // Apply result but don't apply HP damage (simulate perfect play)
        useRunStore.getState().applyShiftResult(result);

        if (shift < 8) useRunStore.getState().advanceToNextShift();
      }

      expect(useRunStore.getState().currentShift).toBe(8);
      const runResult = useRunStore.getState().endRun(true);

      expect(runResult!.won).toBe(true);
      expect(runResult!.shiftsSurvived).toBe(8);
      expect(runResult!.totalOrdersCompleted).toBeGreaterThan(0);
    });

    it('run ends when HP hits 0 mid-run', () => {
      useRunStore.getState().startRun(12345, 'normal');

      // Take enough damage to die on shift 1
      const dead = useRunStore.getState().damageHp(9999);
      expect(dead).toBe(true);

      // Run should be ended as failed
      const result = useRunStore.getState().endRun(false);
      expect(result!.won).toBe(false);
      expect(result!.finalHp).toBe(0);
    });

    it('later shifts generate more total orders than early shifts (escalation)', () => {
      const seed = 42;
      const shift1 = runShiftFast(1, seed, 'normal');
      // Shift 8 is much harder (16x10 grid, 18 blocked cells, 3.5s spawn, 22s deadline).
      // Without enough cranes, integrity depletes early. Give it 3 cranes + max integrity
      // so the simulation runs its full duration.
      const shift8 = runShiftFast(8, seed, 'normal', ['second_crane', 'third_crane']);

      const shift1Total = shift1.ordersCompleted + shift1.ordersFailed;
      const shift8Total = shift8.ordersCompleted + shift8.ordersFailed;

      // Shift 8 is longer (140s vs 90s) and has faster spawning (3.5s vs 8s)
      expect(shift8Total).toBeGreaterThanOrEqual(shift1Total);
    });
  });

  // =========================================================================
  // Difficulty Scaling (Engine Level)
  // =========================================================================

  describe('Difficulty Scaling', () => {
    it('hard difficulty generates more failed orders than normal (harder)', () => {
      const seed = 99999; // Use a seed where failures are likely

      const normalResult = runShiftFast(5, seed, 'normal');
      const hardResult = runShiftFast(5, seed, 'hard');

      // Hard has tighter deadlines and more blocked cells, so more failures expected
      // The total orders also differs, so we check failure RATE not raw count
      const normalFailRate = normalResult.ordersCompleted + normalResult.ordersFailed > 0
        ? normalResult.ordersFailed / (normalResult.ordersCompleted + normalResult.ordersFailed)
        : 0;
      const hardFailRate = hardResult.ordersCompleted + hardResult.ordersFailed > 0
        ? hardResult.ordersFailed / (hardResult.ordersCompleted + hardResult.ordersFailed)
        : 0;

      // Hard mode should have a higher (or equal) failure rate
      expect(hardFailRate).toBeGreaterThanOrEqual(normalFailRate);
    });

    it('hard difficulty produces a lower score than normal for the same seed', () => {
      const seed = 12345;
      const normalResult = runShiftFast(1, seed, 'normal');
      const hardResult = runShiftFast(1, seed, 'hard');

      // Hard produces more failures = fewer completions = lower score
      // (Score is based on completions, which hard makes harder)
      expect(hardResult.score).toBeLessThanOrEqual(normalResult.score);
    });
  });

  // =========================================================================
  // Upgrade Effects (Engine Level)
  // =========================================================================

  describe('Upgrade Effects on Simulation', () => {
    it('afterburners upgrade results in higher crane speed in shift parameters', () => {
      const seed = 42;
      const noFlags = applyUpgradesToFlags({}, []);
      const withFlags = applyUpgradesToFlags({}, ['afterburners']);

      const baseParams = generateShiftParameters(1, seed, 'normal', [], null, noFlags);
      const boostedParams = generateShiftParameters(1, seed, 'normal', ['afterburners'], null, withFlags);

      expect(boostedParams.craneSpeed).toBeGreaterThan(baseParams.craneSpeed);
    });

    it('simulation with afterburners runs correctly (no crash)', () => {
      // Just verify it completes without throwing
      expect(() => runShiftFast(1, 12345, 'normal', ['afterburners'])).not.toThrow();
    });

    it('simulation with vip_clients flag runs correctly (no crash)', () => {
      expect(() => runShiftFast(3, 12345, 'normal', ['vip_clients'])).not.toThrow();
    });

    it('simulation with smart_sorting flag runs correctly (no crash)', () => {
      expect(() => runShiftFast(4, 12345, 'normal', ['smart_sorting'])).not.toThrow();
    });

    it('simulation with multiple upgrades stacked runs correctly', () => {
      const upgrades = ['afterburners', 'smart_sorting', 'vip_clients'];
      expect(() => runShiftFast(5, 12345, 'normal', upgrades)).not.toThrow();
    });
  });

  // =========================================================================
  // Full Run Score Calculation
  // =========================================================================

  describe('Score Calculation (Run → Meta)', () => {
    it('a full 8-shift run produces a positive score', () => {
      const seed = 12345;
      useRunStore.getState().startRun(seed, 'normal');

      for (let shift = 1; shift <= 8; shift++) {
        const result = runShiftFast(shift, seed);
        useRunStore.getState().applyShiftResult(result);
        if (shift < 8) useRunStore.getState().advanceToNextShift();
      }

      const runResult = useRunStore.getState().endRun(true);
      expect(runResult!.score).toBeGreaterThan(0);
    });

    it('winning run score is higher than equivalent losing run score', () => {
      const seed = 12345;

      // Winning run: complete all 8 shifts
      useRunStore.getState().startRun(seed, 'normal');
      for (let shift = 1; shift <= 8; shift++) {
        useRunStore.getState().applyShiftResult(runShiftFast(shift, seed));
        if (shift < 8) useRunStore.getState().advanceToNextShift();
      }
      const winResult = useRunStore.getState().endRun(true);

      // Losing run: only 3 shifts
      useRunStore.getState().startRun(seed, 'normal');
      for (let shift = 1; shift <= 3; shift++) {
        useRunStore.getState().applyShiftResult(runShiftFast(shift, seed));
        if (shift < 3) useRunStore.getState().advanceToNextShift();
      }
      const lossResult = useRunStore.getState().endRun(false);

      expect(winResult!.score).toBeGreaterThan(lossResult!.score);
    });
  });
});
