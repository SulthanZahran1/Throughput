import type {
  Order,
  SimulationContext,
  OrderDiagnostics,
  BottleneckLabel,
  EtaDesignation,
  CellKey,
  Slot,
} from './types';
import { manhattanDistance, fromKey, getBreachDamage } from './types';
import { getEstimatedCompletionTime } from './crane';

// ============================================================================
// Internal Helpers
// ============================================================================

/** Get the effective crane speed (cells/sec) considering upgrades */
function getEffectiveCraneSpeed(context: SimulationContext): number {
  const baseSpeed = 2;
  return context.flags.afterburners ? baseSpeed * 1.3 : baseSpeed;
}

/** Get transfer time from any crane (fallback to 1s if no cranes) */
function getTransferTime(context: SimulationContext): number {
  if (context.cranes.length > 0) return context.cranes[0].transferTime;
  return 1;
}

/**
 * Compute a simple ETA estimate for an order, used by diagnostics.
 * Finds the nearest crane (idle or soonest-free) and calculates
 * travel + transfer time.
 * Returns null if no crane exists.
 */
function estimateOrderEta(order: Order, context: SimulationContext): number | null {
  if (context.cranes.length === 0) return null;

  const speed = getEffectiveCraneSpeed(context);
  const transferTime = getTransferTime(context);

  // Determine source and destination for this order
  // Store: item is on the input slot, goes to storage
  // Retrieve: item is in storage, goes to output
  let sourcePos: { x: number; y: number } | null = null;
  let destPos: { x: number; y: number } | null = null;

  if (order.type === 'store') {
    // Source is an input slot (pickup from input)
    // Destination is an empty storage slot (fallback to first storage if none)
    const inputSlots = context.grid.inputSlots;
    if (inputSlots.length > 0) {
      sourcePos = fromKey(inputSlots[0]);
    }
    const emptyStorageSlots = context.grid.storageSlots.filter(
      key => !context.grid.slots.get(key)?.item
    );
    if (emptyStorageSlots.length > 0) {
      destPos = fromKey(emptyStorageSlots[0]);
    } else if (context.grid.storageSlots.length > 0) {
      destPos = fromKey(context.grid.storageSlots[0]);
    }
  } else {
    // Retrieve: source is a storage slot with matching item
    // Destination is an output slot
    const matchingSlots = context.grid.storageSlots.filter(key => {
      const slot = context.grid.slots.get(key);
      return slot?.item?.type === order.itemType;
    });
    if (matchingSlots.length > 0) {
      sourcePos = fromKey(matchingSlots[0]);
    }
    const outputSlots = context.grid.outputSlots;
    if (outputSlots.length > 0) {
      destPos = fromKey(outputSlots[0]);
    }
  }

  if (!sourcePos || !destPos) return null;

  // Find the nearest or soonest-available crane
  let minEta = Infinity;

  for (const crane of context.cranes) {
    const cranePos = { x: crane.x, y: crane.y };
    const availTime = getEstimatedCompletionTime(crane, {
      afterburners: context.flags.afterburners,
    });

    // Distance from crane position to source, then source to dest
    const distToSource = manhattanDistance(cranePos, sourcePos);
    const distSourceToDest = manhattanDistance(sourcePos, destPos);

    const travelTime = (distToSource + distSourceToDest) / speed;
    const totalTransferTime = transferTime * 2; // pickup + dropoff
    const totalTime = availTime + travelTime + totalTransferTime;

    if (totalTime < minEta) {
      minEta = totalTime;
    }
  }

  return minEta === Infinity ? null : minEta;
}

/**
 * Determine breach risk based on ETA vs deadline.
 * If ETA is null (blocked), return 'BLOCKED'.
 */
function getBreachRisk(eta: number | null, deadline: number): EtaDesignation {
  if (eta === null) return 'BLOCKED';
  if (eta > deadline) return 'LIKELY BREACH';
  return 'ON TRACK';
}

// ============================================================================
// Bottleneck Detection
// ============================================================================

/** Check if all cranes are busy */
function checkAllCranesBusy(context: SimulationContext): boolean {
  return context.cranes.every(c => c.state !== 'IDLE');
}

/** Check if the required item type exists in storage for a retrieve order */
function checkNoMatchingItem(order: Order, context: SimulationContext): boolean {
  if (order.type !== 'retrieve') return false;
  const count = context.inventory.get(order.itemType) ?? 0;
  return count === 0;
}

/** Check if there's any empty storage slot */
function checkNoStorageSpace(context: SimulationContext): boolean {
  return !context.grid.storageSlots.some(
    key => !context.grid.slots.get(key)?.item
  );
}

/** Check if all input slots are occupied */
function checkInputBlocked(context: SimulationContext): boolean {
  return context.grid.inputSlots.every(
    key => context.grid.slots.get(key)?.item !== null
  );
}

/** Check if all output slots are occupied */
function checkOutputCongested(context: SimulationContext): boolean {
  return context.grid.outputSlots.every(
    key => context.grid.slots.get(key)?.item !== null
  );
}

/** Check if deadline is critically low (< 30% of maxDeadline) */
function checkLowDeadline(order: Order): boolean {
  if (order.maxDeadline <= 0) return false;
  return order.deadline / order.maxDeadline < 0.3;
}

/** Check if VIP order deadline is at risk (< 50% of maxDeadline) */
function checkVipRisk(order: Order): boolean {
  if (order.priority !== 'vip' && order.orderClass !== 'vip') return false;
  if (order.maxDeadline <= 0) return false;
  return order.deadline / order.maxDeadline < 0.5;
}

/**
 * Determine the bottleneck label for an order by checking conditions
 * in priority order.
 */
function determineBottleneck(
  order: Order,
  context: SimulationContext
): BottleneckLabel {
  // System-level bottlenecks first
  if (order.type === 'store') {
    if (checkAllCranesBusy(context)) return 'ALL CRANES BUSY';
    if (checkInputBlocked(context)) return 'INPUT BLOCKED';
    if (checkNoStorageSpace(context)) return 'NO STORAGE SPACE';
  } else {
    // retrieve
    if (checkAllCranesBusy(context)) return 'ALL CRANES BUSY';
    if (checkNoMatchingItem(order, context)) return 'NO MATCHING ITEM';
    if (checkOutputCongested(context)) return 'OUTPUT CONGESTED';
  }

  // Order-level bottlenecks
  if (checkLowDeadline(order)) return 'LOW DEADLINE';
  if (checkVipRisk(order)) return 'VIP RISK';

  return null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Diagnose a single order to determine its bottleneck, ETA, and breach risk.
 */
export function diagnoseOrder(
  order: Order,
  context: SimulationContext
): OrderDiagnostics {
  const bottleneck = determineBottleneck(order, context);
  const eta = estimateOrderEta(order, context);
  const canBeFulfilled = eta !== null;

  return {
    orderId: order.id,
    bottleneck,
    canBeFulfilled,
    eta,
    deadline: order.deadline,
    breachRisk: getBreachRisk(eta, order.deadline),
  };
}

/**
 * Run diagnostics for all active orders in the simulation.
 */
export function diagnoseAllOrders(
  context: SimulationContext
): Map<string, OrderDiagnostics> {
  const results = new Map<string, OrderDiagnostics>();
  for (const order of context.orders) {
    results.set(order.id, diagnoseOrder(order, context));
  }
  return results;
}

/**
 * Get system-level bottleneck diagnostics.
 *
 * Returns whether input is ok (has free slots), storage utilization ratio,
 * whether output is clear (has free slots), and the system's most critical
 * bottleneck label.
 */
export function getSystemDiagnostics(
  context: SimulationContext
): {
  inputOk: boolean;
  storageUtilization: number;
  outputClear: boolean;
  bottleneck: BottleneckLabel;
} {
  // Input check
  const inputSlots = context.grid.inputSlots;
  const inputOk = inputSlots.some(
    key => !context.grid.slots.get(key)?.item
  );

  // Storage utilization
  const totalStorage = context.grid.storageSlots.length;
  const occupiedStorage = context.grid.storageSlots.filter(
    key => context.grid.slots.get(key)?.item !== null
  ).length;
  const storageUtilization =
    totalStorage > 0 ? occupiedStorage / totalStorage : 0;

  // Output check
  const outputSlots = context.grid.outputSlots;
  const outputClear = outputSlots.some(
    key => !context.grid.slots.get(key)?.item
  );

  // Determine the most critical system-level bottleneck
  let bottleneck: BottleneckLabel = null;
  if (context.cranes.every(c => c.state !== 'IDLE')) {
    bottleneck = 'ALL CRANES BUSY';
  } else if (!inputOk) {
    bottleneck = 'INPUT BLOCKED';
  } else if (!outputClear) {
    bottleneck = 'OUTPUT CONGESTED';
  } else if (storageUtilization >= 1) {
    bottleneck = 'NO STORAGE SPACE';
  }

  return {
    inputOk,
    storageUtilization,
    outputClear,
    bottleneck,
  };
}
