import type { Order, EpState } from './types';
import {
  EP_RECOVERY_4_ORDERS,
  EP_RECOVERY_VIP,
  EP_RECOVERY_QUEUE_CLEAR,
} from './types';

// ============================================================================
// EpGain
// ============================================================================

export interface EpGain {
  amount: number;
  reason: 'streak' | 'vip' | 'queue_clear';
}

// ============================================================================
// Spend EP
// ============================================================================

/**
 * Spend EP if sufficient. Deducts from current and returns success status
 * along with the remaining EP after spend (or current if insufficient).
 */
export function spendEp(
  ep: EpState,
  amount: number
): { success: boolean; remaining: number } {
  if (ep.current < amount) {
    return { success: false, remaining: ep.current };
  }

  ep.current -= amount;
  return { success: true, remaining: ep.current };
}

// ============================================================================
// Recover EP
// ============================================================================

/**
 * Add EP up to max. Clamps at ep.max.
 */
export function recoverEp(ep: EpState, amount: number): void {
  ep.current = Math.min(ep.current + amount, ep.max);
}

// ============================================================================
// Track Order Completion (streak & VIP recovery)
// ============================================================================

/**
 * Track consecutive orders completed without breach.
 * - Increments the consecutive-order counter.
 * - Every 4th consecutive order without breach triggers `streak` recovery.
 * - VIP orders additionally trigger `vip` recovery.
 *
 * Returns an EpGain if any recovery was triggered, or null otherwise.
 *
 * Priority: if both streak and VIP trigger on the same order (e.g. a VIP
 * order is the 4th consecutive), streak takes precedence.
 */
export function trackOrderComplete(
  ep: EpState,
  order: Order
): EpGain | null {
  ep.consecutiveOrdersWithoutBreach++;

  // Check streak recovery first (every 4 consecutive orders)
  if (ep.consecutiveOrdersWithoutBreach % 4 === 0) {
    const amount = EP_RECOVERY_4_ORDERS;
    recoverEp(ep, amount);
    return { amount, reason: 'streak' };
  }

  // Check VIP recovery
  if (order.priority === 'vip' || order.orderClass === 'vip') {
    const amount = EP_RECOVERY_VIP;
    recoverEp(ep, amount);
    return { amount, reason: 'vip' };
  }

  return null;
}

// ============================================================================
// Track Queue Clear Recovery
// ============================================================================

/**
 * If the queue was at 5+ items and is now cleared below the threshold,
 * recover EP_RECOVERY_QUEUE_CLEAR EP.
 *
 * Threshold: previous queue length >= 5 and new queue length < 5.
 */
export function trackQueueClear(
  ep: EpState,
  previousQueueLength: number,
  newQueueLength: number
): number {
  if (previousQueueLength >= 5 && newQueueLength < 5) {
    const amount = EP_RECOVERY_QUEUE_CLEAR;
    recoverEp(ep, amount);
    return amount;
  }
  return 0;
}

// ============================================================================
// Track Breach (reset streak)
// ============================================================================

/**
 * Reset the consecutive-orders-without-breach counter upon a breach.
 */
export function trackBreach(ep: EpState): void {
  ep.consecutiveOrdersWithoutBreach = 0;
}

// ============================================================================
// Get Max EP
// ============================================================================

/**
 * Return the maximum EP for the given EP state.
 */
export function getMaxEp(ep: EpState): number {
  return ep.max;
}
