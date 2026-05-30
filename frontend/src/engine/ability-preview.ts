import type {
  SimulationContext,
  Order,
  PriorityOverridePreview,
  TurboPreview,
  FreezePreview,
  RejectPreview,
  CoreSurgePreview,
  PreviewOutcome,
  EtaResult,
} from './types';
import { getCraneInterruptibility, getBreachDamage } from './types';
import { computeExactEta } from './eta-service';

// ============================================================================
// Internal Helpers
// ============================================================================

/** Get the current EtaResult for an order using current policy */
function getCurrentEta(
  order: Order,
  context: SimulationContext
): EtaResult {
  return computeExactEta(order, context, context.currentPolicy);
}

/**
 * Determine the preview outcome given current and projected ETA vs deadline.
 * Only meaningful for orders that have an actual deadline to compare against.
 */
function getPreviewOutcome(
  currentEta: number,
  projectedEta: number,
  deadline: number,
  netHpGain?: number
): PreviewOutcome {
  if (netHpGain !== undefined && netHpGain > 0) {
    return 'NET +1 HP';
  }

  if (!Number.isFinite(currentEta) && !Number.isFinite(projectedEta)) return 'NO EFFECT';
  if (projectedEta >= currentEta) return 'NO EFFECT';
  if (projectedEta <= deadline) return 'SAVES';
  return 'RISK';
}

/** Count cranes that can be safely interrupted (no item held, not depositing) */
function countSafeInterruptibleCranes(context: SimulationContext): number {
  return context.cranes.filter(c => getCraneInterruptibility(c) === 'safe').length;
}

/** Create a deep copy of context with modified cranes for "what-if" scenarios */
function cloneContext(context: SimulationContext): SimulationContext {
  const clonedSlots = new Map(
    Array.from(context.grid.slots.entries()).map(([key, slot]) => [
      key,
      { ...slot, item: slot.item ? { ...slot.item } : null },
    ])
  );

  return {
    ...context,
    grid: {
      ...context.grid,
      slots: clonedSlots,
      inputSlots: [...context.grid.inputSlots],
      outputSlots: [...context.grid.outputSlots],
      storageSlots: [...context.grid.storageSlots],
    },
    cranes: context.cranes.map(crane => ({
      ...crane,
      heldItem: crane.heldItem ? { ...crane.heldItem } : null,
      currentJob: crane.currentJob ? { ...crane.currentJob } : null,
    })),
    orders: context.orders.map(order => ({
      ...order,
      batchInfo: order.batchInfo ? { ...order.batchInfo } : null,
      contractInfo: order.contractInfo ? { ...order.contractInfo } : null,
    })),
    zones: context.zones.map(zone => ({ ...zone, cells: [...zone.cells] })),
    inventory: new Map(context.inventory),
    ep: { ...context.ep },
    activeAbilities: { ...context.activeAbilities },
    stats: { ...context.stats },
  };
}

// ============================================================================
// Priority Override Preview
// ============================================================================

/**
 * Preview what would happen if a specific order gets priority override.
 *
 * We simulate by giving the target order the best possible crane assignment:
 * - Use the nearest safe-interruptible crane
 * - Recalculate ETA with minimum crane waiting time
 * - Cranes can be interrupted if they are in a safe state
 */
export function previewPriorityOverride(
  orderId: string,
  context: SimulationContext
): PriorityOverridePreview {
  const order = context.orders.find(o => o.id === orderId);
  if (!order) {
    return {
      orderId,
      currentEta: Infinity,
      projectedEta: Infinity,
      outcome: 'NO EFFECT',
      cranesInterrupted: 0,
      reason: 'Order not found',
    };
  }

  const currentResult = getCurrentEta(order, context);
  const currentEta = currentResult.eta;

  // Simulate priority: treat as if order is first in queue
  // Clone context and assign best crane
  const simContext = cloneContext(context);
  const safeCranes = countSafeInterruptibleCranes(simContext);

  // Count how many busy cranes exist (potential interruptions)
  const busyCranes = simContext.cranes.filter(c => c.state !== 'IDLE').length;
  const cranesInterrupted = Math.min(safeCranes, busyCranes);

  // Simulate by setting all safe-interruptible cranes to IDLE for the re-calculation
  for (const crane of simContext.cranes) {
    if (getCraneInterruptibility(crane) === 'safe') {
      crane.state = 'IDLE';
      crane.currentJob = null;
    }
  }

  // Recalculate ETA with freed cranes but with the same policy
  const projectedResult = computeExactEta(order, simContext, simContext.currentPolicy);
  const projectedEta = projectedResult.eta;

  const outcome = getPreviewOutcome(
    currentEta,
    projectedEta,
    order.deadline
  );

  let reason: string;
  if (outcome === 'SAVES') {
    reason = `Priority override projects to save this order (ETA ${projectedEta.toFixed(1)}s vs deadline ${order.deadline}s)`;
  } else if (outcome === 'RISK') {
    reason = 'Priority override could delay other critical orders';
  } else {
    reason = 'Priority override shows no significant change';
  }

  return {
    orderId,
    currentEta: isFinite(currentEta) ? currentEta : Infinity,
    projectedEta: isFinite(projectedEta) ? projectedEta : Infinity,
    outcome,
    cranesInterrupted,
    reason,
  };
}

// ============================================================================
// Turbo Preview
// ============================================================================

/**
 * Preview the effect of activating Turbo (speed boost).
 * Turbo doubles movement speed for 6-8 seconds, multiplier 1.5x.
 */
export function previewTurbo(context: SimulationContext): TurboPreview {
  const duration = 7; // Average of 6-8
  const speedMultiplier = 1.5;

  // Find critical orders — those with imminent breach risk
  const criticalOrders = context.orders.filter(
    o => o.deadline < 30
  );

  const affectedOrders: TurboPreview['affectedOrders'] = [];

  for (const order of criticalOrders) {
    const currentResult = getCurrentEta(order, context);
    const currentEta = currentResult.eta;

    // Simulate turbo: clone context and apply speed boost
    const simContext = cloneContext(context);
    simContext.activeAbilities.turbo = true;
    simContext.activeAbilities.turboRemaining = duration;
    simContext.activeAbilities.turboSpeedMultiplier = speedMultiplier;

    const projectedResult = computeExactEta(order, simContext, simContext.currentPolicy);
    const projectedEta = projectedResult.eta;

    affectedOrders.push({
      orderId: order.id,
      currentEta: isFinite(currentEta) ? currentEta : Infinity,
      projectedEta: isFinite(projectedEta) ? projectedEta : Infinity,
      outcome: getPreviewOutcome(currentEta, projectedEta, order.deadline),
    });
  }

  return {
    duration,
    speedMultiplier,
    affectedOrders,
  };
}

// ============================================================================
// Freeze Preview
// ============================================================================

/**
 * Preview the effect of activating Freeze (deadline pause).
 * Freeze pauses all deadlines for 4 seconds.
 * Each active order effectively gets a 4-second deadline extension.
 */
export function previewFreeze(context: SimulationContext): FreezePreview {
  const duration = 4;
  const deadlineExtension = 4; // Each paused second = 1 extra second on deadlines

  return {
    duration,
    deadlineExtension,
  };
}

// ============================================================================
// Reject Preview
// ============================================================================

/**
 * Preview the effect of rejecting an order.
 * Rejecting avoids breach damage but costs 1 integrity.
 * Only returns a meaningful preview for orders that are at risk of breaching.
 */
export function previewReject(
  orderId: string,
  context: SimulationContext
): RejectPreview {
  const order = context.orders.find(o => o.id === orderId);

  if (!order) {
    return {
      orderId,
      breachDamage: 0,
      cost: 1,
      netHpGain: -1,
    };
  }

  // Check if the order is likely to breach
  const currentResult = getCurrentEta(order, context);
  const isBreaching = currentResult.designation === 'LIKELY BREACH' || currentResult.designation === 'BLOCKED';

  const breachDamage = getBreachDamage(order);
  const cost = 1; // Reject costs 1 integrity

  // Net gain: -cost for rejection, but avoids -breachDamage if it would breach
  // If not breaching, rejecting costs 1 HP with no benefit
  const netHpGain = isBreaching ? (breachDamage - cost) : -cost;

  return {
    orderId,
    breachDamage,
    cost,
    netHpGain,
  };
}

// ============================================================================
// Core Surge Preview
// ============================================================================

/**
 * Preview the effect of activating Core Surge (stronger speed boost, costs integrity).
 * Duration: 6 seconds, multiplier: 2x, cost: 1 integrity.
 */
export function previewCoreSurge(context: SimulationContext): CoreSurgePreview {
  const duration = 6;
  const speedMultiplier = 2.0;
  const cost = 1; // Integrity cost

  return {
    duration,
    speedMultiplier,
    cost,
  };
}
