import type { RNG } from './rng';
import type {
  SimulationContext, SimulationEvent, TickResult, Crane, Order, ShiftResult,
  SimulationFlags, TransferJob, Item, AutomationPolicy,
} from './types';
import {
  getBreachDamage, createEpState,
} from './types';
import type { EpGain } from './ep-system';
import {
  tickCrane, isAvailable, createTransferJob, assignJob, getCurrentKey,
  getInterruptibleCranes, interruptCrane,
} from './crane';
import type { Grid } from './grid';
import { findStorageSlot } from './storage';
import { findRetrievalSlot } from './retrieval';
import {
  trySpawnOrder, updateOrders, completeOrder, removeOrders,
} from './orders';
import { switchPolicy, tickPolicyCooldown, findBestOrderForCraneByPolicy } from './policy';
import { trackOrderComplete, trackBreach, spendEp, trackQueueClear } from './ep-system';
import { computeExactEta } from './eta-service';

// ============================================================================
// Shift/Breach/EP constants
// ============================================================================

export const INITIAL_INTEGRITY = 5;
export const MAX_INTEGRITY = 10;

// ============================================================================
// Simulation Configuration
// ============================================================================

export interface SimulationConfig {
  targetFPS?: number;
  maxDeltaTime?: number;
}

// ============================================================================
// Create Context
// ============================================================================

/**
 * Initialize a new simulation context
 */
export function createSimulationContext(
  seed: number,
  shiftNumber: number,
  difficulty: 'normal' | 'hard' | 'brutal',
  grid: Grid,
  flags: SimulationFlags,
  params: {
    totalShiftTime: number;
    orderSpawnRate: number;
    orderDeadlineBase: number;
    craneCount: number;
    craneSpeed: number;
    transferTime: number;
  },
  rng: RNG,
  startingIntegrity: number = INITIAL_INTEGRITY,
  maxIntegrity: number = MAX_INTEGRITY,
): SimulationContext {
  // Create cranes
  const cranes: Crane[] = [];
  for (let i = 0; i < params.craneCount; i++) {
    const x = Math.floor(grid.width * (0.2 + (i / Math.max(params.craneCount - 1, 1)) * 0.6));
    cranes.push({
      id: `crane-${i}`,
      x,
      y: 2,
      targetX: x,
      targetY: 2,
      state: 'IDLE',
      movingAxis: null,
      heldItem: null,
      transferProgress: 0,
      transferTime: params.transferTime,
      currentJob: null,
    });
  }

  return {
    seed,
    shiftNumber,
    difficulty,
    shiftTimeRemaining: params.totalShiftTime,
    totalShiftTime: params.totalShiftTime,
    realTime: 0,
    grid,
    cranes,
    orders: [],
    zones: [],
    inventory: new Map(),
    flags,
    retrievalMode: 'fifo',
    currentPolicy: 'balanced',
    policyCooldownRemaining: 0,
    lastPolicySwitchTime: 0,
    ep: createEpState(),
    integrity: startingIntegrity,
    maxIntegrity,
    activeAbilities: {
      turbo: false,
      turboRemaining: 0,
      turboSpeedMultiplier: 1.5,
      freeze: false,
      freezeRemaining: 0,
      coreSurge: false,
      coreSurgeRemaining: 0,
      coreSurgeSpeedMultiplier: 2.0,
    },
    orderSpawnRate: params.orderSpawnRate,
    orderDeadlineBase: params.orderDeadlineBase,
    lastOrderTime: -params.orderSpawnRate,
    rng,
    stats: {
      ordersCompleted: 0,
      ordersFailed: 0,
      itemsStored: 0,
      itemsRetrieved: 0,
      vipOrdersCompleted: 0,
      batchOrdersCompleted: 0,
      contractOrdersCompleted: 0,
      integrityLost: 0,
      epSpent: 0,
      epRecovered: 0,
    },
  };
}

// ============================================================================
// Main Simulation Tick
// ============================================================================

/**
 * Main simulation tick - advances the simulation by dt seconds
 */
export function tickSimulation(
  context: SimulationContext,
  dt: number,
  config: SimulationConfig = {}
): TickResult {
  const { maxDeltaTime = Infinity } = config;

  // Cap delta time
  const safeDt = Math.min(dt, maxDeltaTime);

  const events: SimulationEvent[] = [];

  // 1. Update timers
  context.shiftTimeRemaining -= safeDt;
  context.realTime += safeDt;

  // Check for shift end
  if (context.shiftTimeRemaining <= 0) {
    context.shiftTimeRemaining = 0;
    events.push({
      type: 'SHIFT_END',
      timestamp: context.realTime,
      data: { reason: 'time_expired' },
    });
    return { context, events, deltaTime: safeDt };
  }

  // 2. Tick policy cooldown
  tickPolicyCooldown(context, safeDt);

  // 3. Tick active abilities
  tickAbilities(context, safeDt);

  // 4. Spawn new orders
  const newOrder = trySpawnOrder(context, events);
  if (newOrder) {
    context.orders.push(newOrder);
    context.lastOrderTime = context.realTime;
  }

  // 5. Update existing orders (deadlines) — skip when freeze is active
  if (!context.activeAbilities.freeze) {
    const { expiredOrders } = updateOrders(context, events, safeDt);

    // 6. Remove expired orders and apply variable breach damage
    if (expiredOrders.length > 0) {
      let totalIntegrityLoss = 0;
      for (const order of expiredOrders) {
        const damage = getBreachDamage(order);
        totalIntegrityLoss += damage;

        // Track breach for EP system
        trackBreach(context.ep);

        // Check if this was a batch parent — fail remaining children
        if (order.orderClass === 'batch') {
          events.push({
            type: 'BATCH_PARENT_FAILED',
            timestamp: context.realTime,
            data: {
              orderId: order.id,
              batchId: order.batchInfo?.batchId,
              breachDamage: damage,
            },
          });
        }
      }

      // Apply integrity loss
      context.integrity = Math.max(0, context.integrity - totalIntegrityLoss);
      context.stats.integrityLost += totalIntegrityLoss;

      events.push({
        type: 'INTEGRITY_LOST',
        timestamp: context.realTime,
        data: { amount: totalIntegrityLoss, remaining: context.integrity },
      });

      removeOrders(context, expiredOrders);

      // Check for run-ending condition
      if (context.integrity <= 0) {
        events.push({
          type: 'SHIFT_END',
          timestamp: context.realTime,
          data: { reason: 'integrity_depleted' },
        });
        return { context, events, deltaTime: safeDt };
      }
    }
  }

  // 7. Create jobs for orders using policy-based ordering
  assignJobsToCranes(context);

  // 8. Tick all cranes
  const speedMult = getEffectiveSpeedMultiplier(context);
  for (const crane of context.cranes) {
    const result = tickCrane(crane, safeDt, context.grid, context.flags, speedMult);

    if (result?.event === 'pickup_complete' && result.item) {
      events.push({
        type: 'CRANE_PICKUP',
        timestamp: context.realTime,
        data: { craneId: crane.id, itemId: result.item.id, cellKey: result.cellKey },
      });
    }

    if (result?.event === 'dropoff_complete' && result.item) {
      events.push({
        type: 'CRANE_DROPOFF',
        timestamp: context.realTime,
        data: { craneId: crane.id, itemId: result.item.id, cellKey: result.cellKey },
      });

      handleDropoff(result.orderId, result.item, result.cellKey!, context, events);
    }
  }

  // 9. Track EP recovery from queue clear
  if (events.length > 0) {
    const queueCleared = trackQueueClear(context.ep, context.orders.length + 1, context.orders.length);
    if (queueCleared > 0) {
      context.stats.epRecovered += queueCleared;
      events.push({
        type: 'EP_CHANGED',
        timestamp: context.realTime,
        data: { amount: queueCleared, reason: 'queue_clear', total: context.ep.current },
      });
    }
  }

  return { context, events, deltaTime: safeDt };
}

// ============================================================================
// Ability Ticking
// ============================================================================

function tickAbilities(context: SimulationContext, dt: number): void {
  const ab = context.activeAbilities;

  if (ab.turbo) {
    ab.turboRemaining -= dt;
    if (ab.turboRemaining <= 0) {
      ab.turbo = false;
      ab.turboRemaining = 0;
    }
  }

  if (ab.freeze) {
    ab.freezeRemaining -= dt;
    if (ab.freezeRemaining <= 0) {
      ab.freeze = false;
      ab.freezeRemaining = 0;
    }
  }

  if (ab.coreSurge) {
    ab.coreSurgeRemaining -= dt;
    if (ab.coreSurgeRemaining <= 0) {
      ab.coreSurge = false;
      ab.coreSurgeRemaining = 0;
    }
  }
}

// ============================================================================
// Job Assignment
// ============================================================================

function assignJobsToCranes(context: SimulationContext): void {
  // Handle orphaned cranes (holding items but job's order expired or invalid)
  for (const crane of context.cranes) {
    if (crane.state === 'IDLE' && crane.heldItem && crane.currentJob) {
      const orderExists = context.orders.some(o => o.id === crane.currentJob!.orderId);

      if (!orderExists) {
        // Orphaned item - create a storage job for it
        const storeKey = findStorageSlot(
          context.grid,
          context.zones,
          crane.heldItem.type,
          { smartSorting: context.flags.smartSorting, zoneMastery: context.flags.zoneMastery },
          context.rng
        );

        if (storeKey) {
          const orphanJob: TransferJob = {
            id: `orphan-${Date.now()}`,
            orderId: 'orphan-order',
            jobType: 'store',
            sourceKey: getCurrentKey(crane),
            destKey: storeKey,
            phase: 'MOVING_TO_DEST',
            expectedItemType: crane.heldItem.type,
          };

          crane.currentJob = orphanJob;
          crane.state = 'MOVING_TO_DEST';
          crane.movingAxis = null;
          const destSlot = context.grid.slots.get(storeKey)!;
          crane.targetX = destSlot.x;
          crane.targetY = destSlot.y;
        }
      } else if (crane.currentJob.phase === 'MOVING_TO_DEST') {
        const destSlot = context.grid.slots.get(crane.currentJob.destKey);
        if (destSlot) {
          crane.state = 'MOVING_TO_DEST';
          crane.movingAxis = null;
          crane.targetX = destSlot.x;
          crane.targetY = destSlot.y;
        }
      }
    }
  }

  // Find available cranes (IDLE with no job and no item)
  const availableCranes = context.cranes.filter(c => isAvailable(c));
  if (availableCranes.length === 0) return;

  // Find orders that don't have a job assigned yet
  const unassignedOrders = context.orders.filter(order => {
    return !context.cranes.some(c => c.currentJob?.orderId === order.id);
  });

  if (unassignedOrders.length === 0) return;

  // Use policy-based ordering instead of simple priority
  for (const crane of availableCranes) {
    const order = findBestOrderForCraneByPolicy(
      [crane],
      unassignedOrders,
      context.currentPolicy,
      context.grid,
    );

    if (order) {
      const job = createJobForOrder(order, context, crane);
      if (job) {
        assignJob(crane, job);
        const idx = unassignedOrders.indexOf(order);
        if (idx !== -1) unassignedOrders.splice(idx, 1);
      }
    }
  }
}

// ============================================================================
// Create Job for Order
// ============================================================================

function createJobForOrder(
  order: Order,
  context: SimulationContext,
  crane: Crane
): TransferJob | null {
  if (order.type === 'store') {
    // Find source (input slot with the item)
    let sourceKey = order.sourceSlotKey;

    if (sourceKey) {
      const sourceSlot = context.grid.slots.get(sourceKey);
      if (!sourceSlot || !sourceSlot.item || sourceSlot.item.type !== order.itemType) {
        sourceKey = null;
      }
    }

    if (!sourceKey) {
      sourceKey = context.grid.inputSlots.find(key => {
        const slot = context.grid.slots.get(key)!;
        return slot.item?.type === order.itemType;
      }) || null;
    }

    if (!sourceKey) return null;

    const destKey = findStorageSlot(
      context.grid,
      context.zones,
      order.itemType,
      { smartSorting: context.flags.smartSorting, zoneMastery: context.flags.zoneMastery },
      context.rng
    );

    if (!destKey) return null;

    return createTransferJob(
      order.id,
      'store',
      sourceKey,
      destKey,
      order.itemType
    );
  } else {
    // Retrieve order
    const sourceKey = findRetrievalSlot(
      context.grid,
      order.itemType,
      context.retrievalMode,
      context.orders,
      crane,
      context.rng
    );

    if (!sourceKey) return null;

    const destKey = context.grid.outputSlots[0];
    if (!destKey) return null;

    return createTransferJob(
      order.id,
      'retrieve',
      sourceKey,
      destKey,
      order.itemType
    );
  }
}

// ============================================================================
// Handle Dropoff
// ============================================================================

function handleDropoff(
  orderId: string | undefined,
  item: Item,
  cellKey: string,
  context: SimulationContext,
  events: SimulationEvent[]
): void {
  const slot = context.grid.slots.get(cellKey)!;

  if (slot.type === 'storage') {
    // Item stored
    events.push({
      type: 'ITEM_STORED',
      timestamp: context.realTime,
      data: { itemId: item.id, itemType: item.type, cellKey },
    });
    context.stats.itemsStored++;

    // Find and complete store order
    let storeOrder = context.orders.find(o =>
      o.type === 'store' && o.id === orderId
    );

    if (!storeOrder) {
      storeOrder = context.orders.find(o =>
        o.type === 'store' && o.itemType === item.type
      );
    }

    if (storeOrder) {
      completeOrder(storeOrder, context, events);
      trackOrderCompleteForEp(context, storeOrder, events);
      removeOrders(context, [storeOrder]);
    }
  } else if (slot.type === 'output') {
    // Item retrieved and delivered
    events.push({
      type: 'ITEM_RETRIEVED',
      timestamp: context.realTime,
      data: { itemId: item.id, itemType: item.type, cellKey },
    });
    context.stats.itemsRetrieved++;

    let retrieveOrder = context.orders.find(o =>
      o.type === 'retrieve' && o.id === orderId
    );

    if (!retrieveOrder) {
      retrieveOrder = context.orders.find(o =>
        o.type === 'retrieve' && o.itemType === item.type
      );
    }

    if (retrieveOrder) {
      completeOrder(retrieveOrder, context, events);
      trackOrderCompleteForEp(context, retrieveOrder, events);
      removeOrders(context, [retrieveOrder]);
    }
  }

  // For batch orders, track child completion
  if (orderId) {
    const completedOrder = context.orders.find(o => o.id === orderId);
    if (completedOrder?.batchInfo) {
      events.push({
        type: 'BATCH_CHILD_COMPLETED',
        timestamp: context.realTime,
        data: {
          batchId: completedOrder.batchInfo.batchId,
          childIndex: completedOrder.batchInfo.childIndex,
          orderId,
        },
      });
    }
  }
}

// ============================================================================
// EP Tracking Helper
// ============================================================================

function trackOrderCompleteForEp(
  context: SimulationContext,
  order: Order,
  events: SimulationEvent[]
): void {
  const gain: EpGain | null = trackOrderComplete(context.ep, order);

  if (gain) {
    context.stats.epRecovered += gain.amount;
    events.push({
      type: 'EP_CHANGED',
      timestamp: context.realTime,
      data: {
        amount: gain.amount,
        reason: gain.reason,
        total: context.ep.current,
      },
    });
  }
}

// ============================================================================
// Policy Switching (exposed)
// ============================================================================

export function switchSimulationPolicy(
  context: SimulationContext,
  newPolicy: AutomationPolicy
): { success: boolean; cooldown: number } {
  const result = switchPolicy(context, newPolicy);
  return { success: result.success, cooldown: result.cooldown };
}

// ============================================================================
// EP Spending
// ============================================================================

export function spendEmergencyPower(
  context: SimulationContext,
  amount: number
): { success: boolean; remaining: number } {
  const result = spendEp(context.ep, amount);
  if (result.success) {
    context.stats.epSpent += amount;
  }
  return result;
}

// ============================================================================
// Ability Activations
// ============================================================================

export interface AbilityActivationResult {
  success: boolean;
  abilityId: 'priority_override' | 'turbo_crane' | 'deadline_freeze' | 'reject_contract' | 'core_surge';
  costPaid: number;
  costType: 'ep' | 'integrity';
  duration?: number;
  targetOrderId?: string;
  projectedEta?: number;
  currentEta?: number;
  cranesInterrupted?: number;
  ordersRemoved?: number;
  integrityRemaining?: number;
  reason?: string;
}

function emitAbilityUsed(
  context: SimulationContext,
  result: AbilityActivationResult
): SimulationEvent {
  return {
    type: 'ABILITY_USED',
    timestamp: context.realTime,
    data: { ...result },
  };
}

function failAbility(
  abilityId: AbilityActivationResult['abilityId'], reason: string): AbilityActivationResult {
  return { success: false, abilityId, costPaid: 0, costType: abilityId === 'reject_contract' || abilityId === 'core_surge' ? 'integrity' : 'ep', reason };
}

export function activatePriorityOverride(
  context: SimulationContext,
  orderId: string
): AbilityActivationResult {
  const order = context.orders.find(o => o.id === orderId);
  if (!order) return failAbility('priority_override', 'Order not found');

  const result = spendEmergencyPower(context, 35);
  if (!result.success) return failAbility('priority_override', 'Insufficient Emergency Power');

  const currentEta = computeExactEta(order, context, context.currentPolicy).eta;
  let projectedEta = currentEta;
  let cranesInterrupted = 0;

  const existingAssignedCrane = context.cranes.find(c => c.currentJob?.orderId === orderId);
  if (!existingAssignedCrane) {
    const interruptibleCranes = getInterruptibleCranes(context.cranes)
      .filter(c => c.currentJob?.orderId !== orderId)
      .sort((a, b) => {
        const aBusy = a.state === 'IDLE' && a.currentJob === null ? 0 : 1;
        const bBusy = b.state === 'IDLE' && b.currentJob === null ? 0 : 1;
        return aBusy - bBusy;
      });

    for (const crane of interruptibleCranes) {
      const wasBusy = crane.state !== 'IDLE' || crane.currentJob !== null;
      const previousJob = crane.currentJob;
      const previousState = crane.state;
      const previousTargetX = crane.targetX;
      const previousTargetY = crane.targetY;
      const previousTransferProgress = crane.transferProgress;
      const previousMovingAxis = crane.movingAxis;

      const interrupted = interruptCrane(crane);
      if (!interrupted) continue;

      const job = createJobForOrder(order, context, crane);
      if (job && assignJob(crane, job)) {
        if (wasBusy) cranesInterrupted++;
        projectedEta = computeExactEta(order, context, context.currentPolicy).eta;
        break;
      }

      crane.currentJob = previousJob;
      crane.state = previousState;
      crane.targetX = previousTargetX;
      crane.targetY = previousTargetY;
      crane.transferProgress = previousTransferProgress;
      crane.movingAxis = previousMovingAxis;
    }
  }

  return {
    success: true,
    abilityId: 'priority_override',
    costPaid: 35,
    costType: 'ep',
    targetOrderId: orderId,
    currentEta: Number.isFinite(currentEta) ? currentEta : undefined,
    projectedEta: Number.isFinite(projectedEta) ? projectedEta : undefined,
    cranesInterrupted,
    reason: existingAssignedCrane
      ? 'Order already had an assigned crane; priority cost paid to lock intervention intent'
      : 'Interrupted the minimum safe crane set and assigned the selected order immediately',
  };
}

export function activateTurbo(context: SimulationContext): AbilityActivationResult {
  const cost = 35;
  const result = spendEmergencyPower(context, cost);
  if (!result.success) return failAbility('turbo_crane', 'Insufficient Emergency Power');

  const duration = 7;
  context.activeAbilities.turbo = true;
  context.activeAbilities.turboRemaining = duration;

  return { success: true, abilityId: 'turbo_crane', costPaid: cost, costType: 'ep', duration };
}

export function activateFreeze(context: SimulationContext): AbilityActivationResult {
  const cost = 60;
  const result = spendEmergencyPower(context, cost);
  if (!result.success) return failAbility('deadline_freeze', 'Insufficient Emergency Power');

  const duration = 4;
  context.activeAbilities.freeze = true;
  context.activeAbilities.freezeRemaining = duration;

  return { success: true, abilityId: 'deadline_freeze', costPaid: cost, costType: 'ep', duration };
}

export function rejectContract(context: SimulationContext, orderId: string): AbilityActivationResult {
  const order = context.orders.find(o => o.id === orderId);
  if (!order) return failAbility('reject_contract', 'Order not found');
  if (context.integrity < 1) return failAbility('reject_contract', 'Insufficient System Integrity');

  context.integrity -= 1;
  context.stats.integrityLost += 1;
  removeOrders(context, [order]);

  return {
    success: true,
    abilityId: 'reject_contract',
    costPaid: 1,
    costType: 'integrity',
    targetOrderId: orderId,
    ordersRemoved: 1,
    integrityRemaining: context.integrity,
    reason: `Rejected order and avoided ${getBreachDamage(order)} breach damage`,
  };
}

export function activateCoreSurge(context: SimulationContext): AbilityActivationResult {
  if (context.integrity < 1) return failAbility('core_surge', 'Insufficient System Integrity');

  context.integrity -= 1;
  context.stats.integrityLost += 1;

  const duration = 6;
  context.activeAbilities.coreSurge = true;
  context.activeAbilities.coreSurgeRemaining = duration;

  return {
    success: true,
    abilityId: 'core_surge',
    costPaid: 1,
    costType: 'integrity',
    duration,
    integrityRemaining: context.integrity,
  };
}

export function activateAbility(
  context: SimulationContext,
  abilityId: AbilityActivationResult['abilityId'],
  targetOrderId?: string
): { result: AbilityActivationResult; events: SimulationEvent[] } {
  let result: AbilityActivationResult;

  switch (abilityId) {
    case 'priority_override':
      result = targetOrderId ? activatePriorityOverride(context, targetOrderId) : failAbility(abilityId, 'Target order required');
      break;
    case 'turbo_crane':
      result = activateTurbo(context);
      break;
    case 'deadline_freeze':
      result = activateFreeze(context);
      break;
    case 'reject_contract':
      result = targetOrderId ? rejectContract(context, targetOrderId) : failAbility(abilityId, 'Target order required');
      break;
    case 'core_surge':
      result = activateCoreSurge(context);
      break;
  }

  return { result, events: result.success ? [emitAbilityUsed(context, result)] : [] };
}

// ============================================================================
// Get effective crane speed multiplier
// ============================================================================

export function getEffectiveSpeedMultiplier(context: SimulationContext): number {
  let mult = 1.0;
  if (context.activeAbilities.turbo) mult *= context.activeAbilities.turboSpeedMultiplier;
  if (context.activeAbilities.coreSurge) mult *= context.activeAbilities.coreSurgeSpeedMultiplier;
  return mult;
}

// ============================================================================
// Shift End Check
// ============================================================================

export function checkShiftEnd(context: SimulationContext): { ended: boolean; reason: 'time' | 'integrity' | null } {
  if (context.shiftTimeRemaining <= 0) {
    return { ended: true, reason: 'time' };
  }
  if (context.integrity <= 0) {
    return { ended: true, reason: 'integrity' };
  }
  return { ended: false, reason: null };
}

// ============================================================================
// Score Calculation
// ============================================================================

export function calculateShiftScore(context: SimulationContext): number {
  const { stats } = context;

  let score = 0;
  score += stats.ordersCompleted * 100;
  score += stats.vipOrdersCompleted * 50;
  score += stats.batchOrdersCompleted * 75;
  score += stats.contractOrdersCompleted * 100;
  score -= stats.ordersFailed * 50;

  const timeBonus = Math.floor(context.shiftTimeRemaining * 10);
  score += timeBonus;

  // Integrity bonus
  score += context.integrity * 25;

  return Math.max(0, score);
}

// ============================================================================
// Shift Result
// ============================================================================

export function generateShiftResult(context: SimulationContext): ShiftResult {
  return {
    shiftNumber: context.shiftNumber,
    completed: context.shiftTimeRemaining > 0 && context.integrity > 0,
    ordersCompleted: context.stats.ordersCompleted,
    ordersFailed: context.stats.ordersFailed,
    vipOrdersCompleted: context.stats.vipOrdersCompleted,
    batchOrdersCompleted: context.stats.batchOrdersCompleted,
    contractOrdersCompleted: context.stats.contractOrdersCompleted,
    hpLost: context.stats.integrityLost,
    hpRecovered: context.stats.epRecovered > 0 ? 0 : 0, // EP recovery isn't HP
    epSpent: context.stats.epSpent,
    epRecovered: context.stats.epRecovered,
    score: calculateShiftScore(context),
    events: [],
  };
}
