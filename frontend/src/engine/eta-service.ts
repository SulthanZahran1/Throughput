import type {
  Order,
  SimulationContext,
  AutomationPolicy,
  EtaResult,
  EtaDesignation,
  Crane,
  CellKey,
} from './types';
import { manhattanDistance, fromKey } from './types';
import { getEstimatedCompletionTime } from './crane';

// ============================================================================
// Internal Helpers
// ============================================================================

/** Get the effective crane speed (cells/sec) considering upgrades and active abilities */
function getEffectiveCraneSpeed(context: SimulationContext): number {
  const baseSpeed = 2;
  let multiplier = 1.0;

  if (context.flags.afterburners) {
    multiplier *= 1.3;
  }

  if (context.activeAbilities.turbo && context.activeAbilities.turboRemaining > 0) {
    multiplier *= context.activeAbilities.turboSpeedMultiplier;
  }

  if (context.activeAbilities.coreSurge && context.activeAbilities.coreSurgeRemaining > 0) {
    multiplier *= context.activeAbilities.coreSurgeSpeedMultiplier;
  }

  return baseSpeed * multiplier;
}

/** Get transfer time (seconds) from any crane in the context */
function getTransferTime(context: SimulationContext): number {
  if (context.cranes.length > 0) return context.cranes[0].transferTime;
  return 1;
}

/**
 * Sort orders by the given policy to determine queue position.
 * Returns the sorted list.
 */
function sortOrdersByPolicy(
  orders: Order[],
  policy: AutomationPolicy
): Order[] {
  const sorted = [...orders];

  switch (policy) {
    case 'balanced':
      // FIFO / creation order
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'deadline_first':
      sorted.sort((a, b) => a.deadline - b.deadline);
      break;
    case 'nearest_first': {
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    }
    case 'storage_first':
      sorted.sort((a, b) => {
        if (a.type === 'store' && b.type !== 'store') return -1;
        if (a.type !== 'store' && b.type === 'store') return 1;
        return a.createdAt - b.createdAt;
      });
      break;
    case 'retrieval_first':
      sorted.sort((a, b) => {
        if (a.type === 'retrieve' && b.type !== 'retrieve') return -1;
        if (a.type !== 'retrieve' && b.type === 'retrieve') return 1;
        return a.createdAt - b.createdAt;
      });
      break;
    case 'vip_first':
      sorted.sort((a, b) => {
        const aVIP = a.priority === 'vip' || a.orderClass === 'vip' ? 0 : 1;
        const bVIP = b.priority === 'vip' || b.orderClass === 'vip' ? 0 : 1;
        if (aVIP !== bVIP) return aVIP - bVIP;
        return a.createdAt - b.createdAt;
      });
      break;
  }

  return sorted;
}

/**
 * Determine source and destination positions for an order.
 * Returns null if the required positions cannot be determined.
 */
function getOrderEndpoints(
  order: Order,
  context: SimulationContext
): { source: { x: number; y: number }; dest: { x: number; y: number } } | null {
  if (order.type === 'store') {
    // Source: an input slot with or without an item (items come from trucks)
    const inputSlots = context.grid.inputSlots;
    if (inputSlots.length === 0) return null;

    // Prefer an input slot that already has an item (incoming delivery)
    let sourceKey: CellKey | null = null;
    for (const key of inputSlots) {
      const slot = context.grid.slots.get(key);
      if (slot?.item && slot.item.type === order.itemType) {
        sourceKey = key;
        break;
      }
    }
    if (!sourceKey) {
      sourceKey = inputSlots[0]; // fallback to first input slot
    }

    // Destination: an empty storage slot
    const emptyStorage = context.grid.storageSlots.filter(
      key => !context.grid.slots.get(key)?.item
    );
    if (emptyStorage.length === 0) return null;
    const destKey = emptyStorage[0];

    return {
      source: fromKey(sourceKey),
      dest: fromKey(destKey),
    };
  } else {
    // Source: a storage slot containing the matching item type
    const matchingStorage = context.grid.storageSlots.filter(key => {
      const slot = context.grid.slots.get(key);
      return slot?.item?.type === order.itemType;
    });
    if (matchingStorage.length === 0) return null;

    // If the order has a pre-resolved source slot, use it
    let sourceKey: CellKey;
    if (order.sourceSlotKey) {
      sourceKey = order.sourceSlotKey;
    } else {
      sourceKey = matchingStorage[0];
    }

    // Destination: an output slot
    const outputSlots = context.grid.outputSlots;
    if (outputSlots.length === 0) return null;

    let destKey: CellKey | null = null;
    for (const key of outputSlots) {
      if (!context.grid.slots.get(key)?.item) {
        destKey = key;
        break;
      }
    }
    if (!destKey) {
      // All output slots full — use first one
      destKey = outputSlots[0];
    }

    return {
      source: fromKey(sourceKey),
      dest: fromKey(destKey),
    };
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute the exact ETA for a single order given the current simulation state
 * and automation policy.
 *
 * The ETA calculation considers:
 * - Travel time: manhattan distance from nearest/soonest crane to source,
 *   then source to dest, divided by effective crane speed
 * - Transfer time: transferTime * 2 (pickup + dropoff)
 * - Queue time: position in policy-sorted queue scaled by average order duration
 *
 * Returns an EtaResult with breakdown and designation.
 */
export function computeExactEta(
  order: Order,
  context: SimulationContext,
  policy: AutomationPolicy
): EtaResult {
  const endpoints = getOrderEndpoints(order, context);
  if (!endpoints) {
    return {
      eta: Infinity,
      designation: 'BLOCKED',
      breakdown: { travelTime: 0, transferTime: 0, queueTime: 0 },
    };
  }

  const transferTime = getTransferTime(context);

  // --- Queue position estimation ---
  const pendingOrders = context.orders.filter(
    o => o.id !== order.id
  );
  const sortedQueue = sortOrdersByPolicy(pendingOrders, policy);
  let queueIndex = sortedQueue.findIndex(o => o.id === order.id);
  if (queueIndex === -1) queueIndex = 0; // Not in queue? treat as first

  // Estimate average order duration based on grid size
  const avgDistance = context.grid.width + context.grid.height; // Diagonal max
  const avgSpeed = getEffectiveCraneSpeed(context);
  const avgTravel = avgDistance / avgSpeed;
  const avgDuration = avgTravel + transferTime * 2;
  const queueTime = queueIndex * avgDuration;

  // --- Travel time ---
  let bestTravelTime = Infinity;

  for (const crane of context.cranes) {
    const cranePos = { x: crane.x, y: crane.y };
    const availTime = getEstimatedCompletionTime(crane, {
      afterburners: context.flags.afterburners,
    });

    const distToSource = manhattanDistance(cranePos, endpoints.source);
    const distSourceToDest = manhattanDistance(endpoints.source, endpoints.dest);
    const speed = getEffectiveCraneSpeed(context);
    const travelTime = (distToSource + distSourceToDest) / speed;

    // The crane might still be busy, but we use availTime to account for waiting
    const totalTime = availTime + travelTime;

    if (totalTime < bestTravelTime) {
      bestTravelTime = totalTime;
    }
  }

  // If all cranes are busy and queue is long, use the queue-time estimate instead
  const travelTime = bestTravelTime === Infinity ? avgTravel : bestTravelTime;
  const totalTransferTime = transferTime * 2;

  const totalEta = travelTime + totalTransferTime + queueTime;

  // --- Designation ---
  let designation: EtaDesignation;
  if (totalEta === Infinity || !isFinite(totalEta)) {
    designation = 'BLOCKED';
  } else if (totalEta > order.deadline) {
    designation = 'LIKELY BREACH';
  } else {
    designation = 'ON TRACK';
  }

  return {
    eta: totalEta,
    designation,
    breakdown: {
      travelTime,
      transferTime: totalTransferTime,
      queueTime,
    },
  };
}

/**
 * Compute ETA for all active orders.
 */
export function computeEtaForAllOrders(
  context: SimulationContext,
  policy: AutomationPolicy
): Map<string, EtaResult> {
  const results = new Map<string, EtaResult>();
  for (const order of context.orders) {
    results.set(order.id, computeExactEta(order, context, policy));
  }
  return results;
}

/**
 * Estimate when a crane will become available for a new job.
 * Returns 0 if the crane is IDLE, otherwise returns the estimated
 * completion time of its current job.
 */
export function estimateCraneAvailability(
  crane: Crane,
  speed: number
): number {
  return getEstimatedCompletionTime(crane, { afterburners: speed > 2 });
}
