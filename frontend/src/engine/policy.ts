/**
 * policy.ts — Automation Policy system for Throughput
 *
 * Provides:
 *  - switchPolicy: Switch the active policy (subject to cooldown)
 *  - tickPolicyCooldown: Tick the cooldown timer
 *  - sortOrdersByPolicy: Sort an order list per the given policy
 *  - findBestOrderForCraneByPolicy: Pick the best order for an available crane
 *
 * Pure engine logic — no React/Zustand imports.
 */

import type {
  AutomationPolicy,
  Crane,
  Grid,
  Order,
  SimulationContext,
  SimulationEvent,
} from './types';
import {
  ALL_POLICIES,
  POLICY_COOLDOWN_MIN,
  POLICY_COOLDOWN_MAX,
  manhattanDistance,
  fromKey,
} from './types';

// ============================================================================
// Result types
// ============================================================================

export interface SwitchPolicyResult {
  success: boolean;
  cooldown: number;
  event?: SimulationEvent;
}

// ============================================================================
// Helper: get a representative source position for an order
// ============================================================================

/**
 * Get the source position of an order for distance calculations.
 * For store orders — uses the first available input slot as a proxy source.
 * For retrieve orders — uses sourceSlotKey if available.
 */
function getOrderSourcePos(order: Order, grid: Grid): { x: number; y: number } | null {
  if (order.type === 'retrieve' && order.sourceSlotKey) {
    return fromKey(order.sourceSlotKey);
  }
  if (order.type === 'store' && grid.inputSlots.length > 0) {
    return fromKey(grid.inputSlots[0]);
  }
  return null;
}

// ============================================================================
// 1. switchPolicy
// ============================================================================

/**
 * Switch the active automation policy.
 *
 * Rules:
 *  - Only succeeds if policyCooldownRemaining === 0
 *  - Cooldown is set to a random value in [POLICY_COOLDOWN_MIN, POLICY_COOLDOWN_MAX]
 *  - If successful, mutates context.currentPolicy and context.policyCooldownRemaining
 *  - Returns a POLICY_SWITCHED event on success
 */
export function switchPolicy(
  context: SimulationContext,
  newPolicy: AutomationPolicy,
): SwitchPolicyResult {
  if (context.policyCooldownRemaining > 0) {
    return { success: false, cooldown: context.policyCooldownRemaining };
  }

  if (!ALL_POLICIES.includes(newPolicy)) {
    return { success: false, cooldown: 0 };
  }

  const oldPolicy = context.currentPolicy;

  // Set a random cooldown (inclusive of max)
  const cooldown = context.rng.nextIntRange(POLICY_COOLDOWN_MIN, POLICY_COOLDOWN_MAX + 1);

  // Mutate context
  context.currentPolicy = newPolicy;
  context.policyCooldownRemaining = cooldown;
  context.lastPolicySwitchTime = context.realTime;

  const event: SimulationEvent = {
    type: 'POLICY_SWITCHED',
    timestamp: context.realTime,
    data: {
      from: oldPolicy,
      to: newPolicy,
      cooldown,
    },
  };

  return { success: true, cooldown, event };
}

// ============================================================================
// 2. tickPolicyCooldown
// ============================================================================

/**
 * Decrease the policy cooldown by dt seconds.
 * Clamps to 0 — never goes negative.
 */
export function tickPolicyCooldown(context: SimulationContext, dt: number): void {
  if (context.policyCooldownRemaining <= 0) return;
  context.policyCooldownRemaining = Math.max(0, context.policyCooldownRemaining - dt);
}

// ============================================================================
// 3. sortOrdersByPolicy
// ============================================================================

/**
 * Sort an array of orders based on the selected automation policy.
 *
 * Policies:
 *  - balanced:         FIFO by createdAt ascending
 *  - deadline_first:   Shortest deadline first (most urgent)
 *  - nearest_first:    Minimum distance from any crane to order source
 *  - storage_first:    Store orders first, then retrieve
 *  - retrieval_first:  Retrieve orders first, then store
 *  - vip_first:        VIP orders first, then normal by deadline
 *
 * Returns a NEW sorted array (does not mutate the input).
 */
export function sortOrdersByPolicy(
  orders: Order[],
  policy: AutomationPolicy,
  cranes: Crane[],
  grid: Grid,
): Order[] {
  // Work on a copy
  const sorted = [...orders];

  switch (policy) {
    case 'balanced': {
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    }

    case 'deadline_first': {
      sorted.sort((a, b) => a.deadline - b.deadline);
      break;
    }

    case 'nearest_first': {
      sorted.sort((a, b) => {
        const aDist = minCraneDistanceToOrder(a, cranes, grid);
        const bDist = minCraneDistanceToOrder(b, cranes, grid);
        return aDist - bDist;
      });
      break;
    }

    case 'storage_first': {
      sorted.sort((a, b) => {
        // Store orders first
        if (a.type !== b.type) {
          return a.type === 'store' ? -1 : 1;
        }
        // Within same type, use FIFO
        return a.createdAt - b.createdAt;
      });
      break;
    }

    case 'retrieval_first': {
      sorted.sort((a, b) => {
        // Retrieve orders first
        if (a.type !== b.type) {
          return a.type === 'retrieve' ? -1 : 1;
        }
        // Within same type, use FIFO
        return a.createdAt - b.createdAt;
      });
      break;
    }

    case 'vip_first': {
      sorted.sort((a, b) => {
        // VIP orders before normal
        if (a.priority !== b.priority) {
          return a.priority === 'vip' ? -1 : 1;
        }
        // Within same priority, shortest deadline first
        return a.deadline - b.deadline;
      });
      break;
    }

    default: {
      // Fallback to balanced
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    }
  }

  return sorted;
}

// ============================================================================
// 4. findBestOrderForCraneByPolicy
// ============================================================================

/**
 * Pick the best order for the next available crane, based on the active policy.
 *
 * @param availableCranes - Cranes that are IDLE and ready for assignment
 * @param orders          - All pending orders to choose from
 * @param policy          - The active automation policy
 * @param grid            - The warehouse grid (for distance calculations)
 * @returns The best order, or null if none is suitable
 */
export function findBestOrderForCraneByPolicy(
  availableCranes: Crane[],
  orders: Order[],
  policy: AutomationPolicy,
  grid: Grid,
): Order | null {
  if (availableCranes.length === 0 || orders.length === 0) {
    return null;
  }

  // Filter to only orders that can actually be fulfilled
  const fulfillable = orders.filter((o) => isOrderFulfillable(o, grid));
  if (fulfillable.length === 0) return null;

  // Sort using the policy — use the first available crane as reference
  // (for nearest_first, any crane works since we compute min distance)
  const referenceCrane = availableCranes[0];
  const sorted = sortOrdersByPolicy(fulfillable, policy, [referenceCrane], grid);

  return sorted[0] ?? null;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Compute the minimum manhattan distance from any crane to the order's source.
 * Returns Infinity if no crane or no source position can be determined.
 */
function minCraneDistanceToOrder(order: Order, cranes: Crane[], grid: Grid): number {
  if (cranes.length === 0) return Infinity;

  const sourcePos = getOrderSourcePos(order, grid);
  if (!sourcePos) return Infinity;

  let minDist = Infinity;
  for (const crane of cranes) {
    const dist = manhattanDistance({ x: crane.x, y: crane.y }, sourcePos);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

/**
 * Quick feasibility check — can this order currently be fulfilled?
 * For retrieve: needs at least one matching item in storage.
 * For store: needs at least one empty storage slot.
 */
function isOrderFulfillable(order: Order, grid: Grid): boolean {
  if (order.type === 'retrieve') {
    // Check if the item type exists somewhere in storage slots
    for (const key of grid.storageSlots) {
      const slot = grid.slots.get(key);
      if (slot?.item?.type === order.itemType) return true;
    }
    return false;
  }
  if (order.type === 'store') {
    // Check if there's an empty storage slot
    for (const key of grid.storageSlots) {
      const slot = grid.slots.get(key);
      if (slot && !slot.item && slot.type === 'storage') return true;
    }
    return false;
  }
  return false;
}

// ============================================================================
// Convenience exports
// ============================================================================

export type { AutomationPolicy };
export { ALL_POLICIES, POLICY_COOLDOWN_MIN, POLICY_COOLDOWN_MAX };
