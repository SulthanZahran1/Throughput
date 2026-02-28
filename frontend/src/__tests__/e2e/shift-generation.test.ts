import { describe, it, expect } from 'vitest';
import { getEscalation, generateShiftParameters, ESCALATION_TABLE } from '../../data/escalation';
import { applyUpgradesToFlags } from '../../data/upgrades';

/**
 * E2E: Shift Generation Tests
 *
 * Tests that the escalation table is internally consistent, and that
 * generateShiftParameters correctly incorporates difficulty, upgrades,
 * and modifiers into the final shift parameters.
 *
 * These are pure function tests — no stores, no simulation.
 */
describe('Shift Generation', () => {
  const noUpgradeFlags = applyUpgradesToFlags({}, []);

  // =========================================================================
  // Escalation Table Integrity
  // =========================================================================

  describe('Escalation Table', () => {
    it('has exactly 8 shift entries', () => {
      expect(ESCALATION_TABLE).toHaveLength(8);
    });

    it('shift numbers are 1-8 in order', () => {
      ESCALATION_TABLE.forEach((entry, i) => {
        expect(entry.shiftNumber).toBe(i + 1);
      });
    });

    it('shift 1 has the correct grid dimensions (8×6)', () => {
      const entry = getEscalation(1);
      expect(entry.gridWidth).toBe(8);
      expect(entry.gridHeight).toBe(6);
    });

    it('shift 8 has the correct grid dimensions (16×10)', () => {
      const entry = getEscalation(8);
      expect(entry.gridWidth).toBe(16);
      expect(entry.gridHeight).toBe(10);
    });

    it('grid width is non-decreasing across shifts (escalation)', () => {
      const widths = ESCALATION_TABLE.map(e => e.gridWidth);
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1]);
      }
    });

    it('order deadlines are non-increasing across shifts (more pressure)', () => {
      const deadlines = ESCALATION_TABLE.map(e => e.orderDeadlineBase);
      for (let i = 1; i < deadlines.length; i++) {
        expect(deadlines[i]).toBeLessThanOrEqual(deadlines[i - 1]);
      }
    });

    it('order spawn rate (seconds between orders) is non-increasing across shifts', () => {
      // Smaller orderSpawnRate = more frequent orders = harder
      const rates = ESCALATION_TABLE.map(e => e.orderSpawnRate);
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
      }
    });

    it('shift time is non-decreasing across shifts (more time = more orders)', () => {
      const times = ESCALATION_TABLE.map(e => e.totalShiftTime);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    it('all entries have positive values for critical fields', () => {
      for (const entry of ESCALATION_TABLE) {
        expect(entry.gridWidth).toBeGreaterThan(0);
        expect(entry.gridHeight).toBeGreaterThan(0);
        expect(entry.totalShiftTime).toBeGreaterThan(0);
        expect(entry.orderSpawnRate).toBeGreaterThan(0);
        expect(entry.orderDeadlineBase).toBeGreaterThan(0);
        expect(entry.craneCount).toBeGreaterThan(0);
        expect(entry.craneSpeed).toBeGreaterThan(0);
        expect(entry.transferTime).toBeGreaterThan(0);
      }
    });

    it('returns max difficulty entry for shifts beyond 8', () => {
      const beyond = getEscalation(99);
      const max = getEscalation(8);
      expect(beyond.gridWidth).toBe(max.gridWidth);
      expect(beyond.orderSpawnRate).toBe(max.orderSpawnRate);
    });
  });

  // =========================================================================
  // generateShiftParameters
  // =========================================================================

  describe('generateShiftParameters', () => {
    it('produces valid parameters for every shift (1-8)', () => {
      for (let shift = 1; shift <= 8; shift++) {
        const params = generateShiftParameters(shift, 12345, 'normal', [], null, noUpgradeFlags);

        expect(params.shiftNumber).toBe(shift);
        expect(params.gridWidth).toBeGreaterThan(0);
        expect(params.gridHeight).toBeGreaterThan(0);
        expect(params.totalShiftTime).toBeGreaterThan(0);
        expect(params.orderSpawnRate).toBeGreaterThan(0);
        expect(params.orderDeadlineBase).toBeGreaterThan(0);
        expect(params.craneCount).toBeGreaterThan(0);
      }
    });

    it('is deterministic: same inputs always produce same output', () => {
      const p1 = generateShiftParameters(4, 42, 'hard', [], 'rush_hour', noUpgradeFlags);
      const p2 = generateShiftParameters(4, 42, 'hard', [], 'rush_hour', noUpgradeFlags);
      expect(p1).toEqual(p2);
    });

    // --- Difficulty scaling ---

    it('hard difficulty has more blocked cells than normal', () => {
      const normal = generateShiftParameters(3, 12345, 'normal', [], null, noUpgradeFlags);
      const hard = generateShiftParameters(3, 12345, 'hard', [], null, noUpgradeFlags);
      expect(hard.blockedCells).toBeGreaterThan(normal.blockedCells);
    });

    it('brutal difficulty has more blocked cells than hard', () => {
      const hard = generateShiftParameters(3, 12345, 'hard', [], null, noUpgradeFlags);
      const brutal = generateShiftParameters(3, 12345, 'brutal', [], null, noUpgradeFlags);
      expect(brutal.blockedCells).toBeGreaterThan(hard.blockedCells);
    });

    it('hard difficulty orders spawn faster than normal', () => {
      const normal = generateShiftParameters(5, 12345, 'normal', [], null, noUpgradeFlags);
      const hard = generateShiftParameters(5, 12345, 'hard', [], null, noUpgradeFlags);
      // Lower orderSpawnRate = more orders per second = harder
      expect(hard.orderSpawnRate).toBeLessThan(normal.orderSpawnRate);
    });

    it('hard difficulty has shorter deadlines than normal', () => {
      const normal = generateShiftParameters(5, 12345, 'normal', [], null, noUpgradeFlags);
      const hard = generateShiftParameters(5, 12345, 'hard', [], null, noUpgradeFlags);
      expect(hard.orderDeadlineBase).toBeLessThan(normal.orderDeadlineBase);
    });

    // --- Upgrade effects ---

    it('afterburners upgrade increases crane speed by ~30%', () => {
      const base = generateShiftParameters(1, 12345, 'normal', [], null, noUpgradeFlags);
      const flags = applyUpgradesToFlags({}, ['afterburners']);
      const boosted = generateShiftParameters(1, 12345, 'normal', ['afterburners'], null, flags);

      expect(boosted.craneSpeed).toBeCloseTo(base.craneSpeed * 1.3, 5);
    });

    it('second_crane upgrade sets craneCount to 2', () => {
      const flags = applyUpgradesToFlags({}, ['second_crane']);
      const params = generateShiftParameters(1, 12345, 'normal', ['second_crane'], null, flags);
      expect(params.craneCount).toBe(2);
    });

    it('third_crane upgrade sets craneCount to 3', () => {
      const flags = applyUpgradesToFlags({}, ['third_crane']);
      const params = generateShiftParameters(1, 12345, 'normal', ['third_crane'], null, flags);
      expect(params.craneCount).toBe(3);
    });

    it('without vip_clients, vipOrderChance is 0', () => {
      const params = generateShiftParameters(5, 12345, 'normal', [], null, noUpgradeFlags);
      expect(params.vipOrderChance).toBe(0);
    });

    it('with vip_clients flag, vipOrderChance is > 0 on shifts that support it', () => {
      const flags = applyUpgradesToFlags({}, ['vip_clients']);
      // Shift 3+ has vipOrderChance in the escalation table
      const params = generateShiftParameters(3, 12345, 'normal', ['vip_clients'], null, flags);
      expect(params.vipOrderChance).toBeGreaterThan(0);
    });

    // --- Modifier passthrough ---

    it('modifierId is preserved in the returned parameters', () => {
      const params = generateShiftParameters(3, 12345, 'normal', [], 'rush_hour', noUpgradeFlags);
      expect(params.modifierId).toBe('rush_hour');
    });

    it('null modifierId is preserved', () => {
      const params = generateShiftParameters(1, 12345, 'normal', [], null, noUpgradeFlags);
      expect(params.modifierId).toBeNull();
    });

    // --- Cross-shift escalation via generateShiftParameters ---

    it('later shifts have larger grids than earlier shifts', () => {
      const shift1 = generateShiftParameters(1, 12345, 'normal', [], null, noUpgradeFlags);
      const shift8 = generateShiftParameters(8, 12345, 'normal', [], null, noUpgradeFlags);
      expect(shift8.gridWidth).toBeGreaterThan(shift1.gridWidth);
      expect(shift8.gridHeight).toBeGreaterThan(shift1.gridHeight);
    });

    it('later shifts have shorter deadlines (increased pressure)', () => {
      const shift1 = generateShiftParameters(1, 12345, 'normal', [], null, noUpgradeFlags);
      const shift8 = generateShiftParameters(8, 12345, 'normal', [], null, noUpgradeFlags);
      expect(shift8.orderDeadlineBase).toBeLessThan(shift1.orderDeadlineBase);
    });
  });

  // =========================================================================
  // applyUpgradesToFlags
  // =========================================================================

  describe('applyUpgradesToFlags', () => {
    it('empty upgrade list produces all-false flags with default crane count', () => {
      const flags = applyUpgradesToFlags({}, []);
      expect(flags.afterburners).toBe(false);
      expect(flags.dualCommand).toBe(false);
      expect(flags.overclocked).toBe(false);
      expect(flags.smartSorting).toBe(false);
      expect(flags.vipClients).toBe(false);
      expect(flags.multiCrane).toBe(1);
    });

    it('afterburners upgrade sets afterburners flag', () => {
      const flags = applyUpgradesToFlags({}, ['afterburners']);
      expect(flags.afterburners).toBe(true);
    });

    it('multiple upgrades apply all their flags', () => {
      const flags = applyUpgradesToFlags({}, ['afterburners', 'smart_sorting', 'vip_clients']);
      expect(flags.afterburners).toBe(true);
      expect(flags.smartSorting).toBe(true);
      expect(flags.vipClients).toBe(true);
    });

    it('unknown upgrade ID is silently ignored', () => {
      // Should not throw
      const flags = applyUpgradesToFlags({}, ['nonexistent_upgrade_id']);
      expect(flags.afterburners).toBe(false);
    });
  });
});
