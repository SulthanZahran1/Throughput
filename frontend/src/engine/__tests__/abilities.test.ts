import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid';
import { createRng } from '../rng';
import {
  activateAbility,
  activateFreeze,
  activatePriorityOverride,
  activateTurbo,
  activateCoreSurge,
  rejectContract,
  tickSimulation,
  createSimulationContext,
} from '../simulation';
import { previewPriorityOverride, previewReject, previewTurbo, previewFreeze, previewCoreSurge } from '../ability-preview';
import { createTransferJob, assignJob } from '../crane';
import type { Order, SimulationContext, SimulationFlags } from '../types';

const defaultFlags: SimulationFlags = {
  dualCommand: false,
  afterburners: false,
  overclocked: false,
  conveyorBelt: false,
  smartSorting: false,
  zoneMastery: false,
  vipClients: false,
  timeWarp: false,
  emergencyBrake: false,
  predictivePathing: false,
  blockedCells: 0,
  multiCrane: 2,
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    type: 'store',
    priority: 'normal',
    orderClass: 'normal',
    itemType: 'red',
    deadline: 12,
    maxDeadline: 12,
    createdAt: 0,
    vipMultiplier: 1,
    batchInfo: null,
    contractInfo: null,
    sourceSlotKey: null,
    ...overrides,
  };
}

function makeContext(): SimulationContext {
  const rng = createRng(12345);
  const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 0 }, rng);
  const context = createSimulationContext(
    12345,
    1,
    'normal',
    grid,
    defaultFlags,
    {
      totalShiftTime: 120,
      orderSpawnRate: 999,
      orderDeadlineBase: 30,
      craneCount: 2,
      craneSpeed: 2,
      transferTime: 1,
    },
    rng,
  );

  const sourceKey = grid.inputSlots[0];
  grid.slots.get(sourceKey)!.item = { id: 'item-1', type: 'red', storedAt: 0 };
  context.orders = [makeOrder({ sourceSlotKey: sourceKey })];
  return context;
}

describe('Core abilities', () => {
  it('activates Turbo Crane by spending EP and boosting crane ETA while active', () => {
    const context = makeContext();
    const before = previewTurbo(context);

    const result = activateTurbo(context);

    expect(result.success).toBe(true);
    expect(result.abilityId).toBe('turbo_crane');
    expect(result.duration).toBe(7);
    expect(context.ep.current).toBe(65);
    expect(context.stats.epSpent).toBe(35);
    expect(context.activeAbilities.turbo).toBe(true);
    expect(previewTurbo(context).speedMultiplier).toBe(before.speedMultiplier);
  });

  it('activates Deadline Freeze by spending EP and pausing order timers only', () => {
    const context = makeContext();
    const originalDeadline = context.orders[0].deadline;

    const result = activateFreeze(context);
    tickSimulation(context, 1);

    expect(result.success).toBe(true);
    expect(result.abilityId).toBe('deadline_freeze');
    expect(result.duration).toBe(4);
    expect(context.ep.current).toBe(40);
    expect(context.orders[0].deadline).toBe(originalDeadline);
    expect(context.shiftTimeRemaining).toBe(119);
    expect(previewFreeze(context).deadlineExtension).toBe(4);
  });

  it('activates Core Surge by spending integrity and applying a stronger global boost', () => {
    const context = makeContext();

    const result = activateCoreSurge(context);

    expect(result.success).toBe(true);
    expect(result.abilityId).toBe('core_surge');
    expect(result.duration).toBe(6);
    expect(context.integrity).toBe(4);
    expect(context.stats.integrityLost).toBe(1);
    expect(context.activeAbilities.coreSurge).toBe(true);
    expect(previewCoreSurge(context).speedMultiplier).toBeGreaterThan(previewTurbo(context).speedMultiplier);
  });

  it('rejects a contract by spending integrity and removing the target order', () => {
    const context = makeContext();
    context.orders[0] = makeOrder({
      id: 'contract-1',
      orderClass: 'contract',
      contractInfo: { contractId: 'debt', breachDamage: 2, reward: '+20 crates', condition: 'rush' },
      sourceSlotKey: context.grid.inputSlots[0],
    });

    const preview = previewReject('contract-1', context);
    const result = rejectContract(context, 'contract-1');

    expect(preview.netHpGain).toBeGreaterThanOrEqual(-1);
    expect(result.success).toBe(true);
    expect(result.abilityId).toBe('reject_contract');
    expect(context.integrity).toBe(4);
    expect(context.orders).toHaveLength(0);
  });

  it('priority override interrupts one safe busy crane and assigns the selected order immediately', () => {
    const context = makeContext();
    const otherOrder = makeOrder({ id: 'other-order', itemType: 'blue', sourceSlotKey: context.grid.inputSlots[1] });
    context.grid.slots.get(context.grid.inputSlots[1])!.item = { id: 'item-2', type: 'blue', storedAt: 0 };
    const currentJob = createTransferJob(otherOrder.id, 'store', context.grid.inputSlots[1], context.grid.storageSlots[0], 'blue');
    assignJob(context.cranes[0], currentJob);
    const secondJob = createTransferJob('background-order', 'store', context.grid.inputSlots[1], context.grid.storageSlots[1], 'blue');
    assignJob(context.cranes[1], secondJob);

    const preview = previewPriorityOverride('order-1', context);
    const result = activatePriorityOverride(context, 'order-1');

    expect(preview.orderId).toBe('order-1');
    expect(result.success).toBe(true);
    expect(result.abilityId).toBe('priority_override');
    expect(result.cranesInterrupted).toBe(1);
    expect(context.ep.current).toBe(65);
    expect(context.cranes.some(crane => crane.currentJob?.orderId === 'order-1')).toBe(true);
    expect(context.cranes.every(crane => crane.heldItem === null)).toBe(true);
  });

  it('activateAbility emits ABILITY_USED events for successful abilities', () => {
    const context = makeContext();

    const { result, events } = activateAbility(context, 'turbo_crane');

    expect(result.success).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('ABILITY_USED');
    expect(events[0].data.abilityId).toBe('turbo_crane');
  });
});
