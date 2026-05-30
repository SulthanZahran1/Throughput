import type { RNG } from './rng';
import type {
  Order,
  ItemType,
  BatchOrderParent,
  BatchInfo,
  ContractInfo,
} from './types';
import { getBreachDamage } from './types';

// ============================================================================
// VIP Order Creation
// ============================================================================

/**
 * Convert a normal order to VIP with a shorter deadline and higher multiplier.
 * - deadline = base order deadline * deadlineMultiplier
 * - vipMultiplier set to provided multiplier
 * - orderClass set to 'vip', priority set to 'vip'
 */
export function createVipOrder(
  baseOrder: Order,
  params: { deadlineMultiplier: number; vipMultiplier: number }
): Order {
  return {
    ...baseOrder,
    orderClass: 'vip',
    priority: 'vip',
    deadline: Math.floor(baseOrder.maxDeadline * params.deadlineMultiplier),
    maxDeadline: baseOrder.maxDeadline,
    vipMultiplier: params.vipMultiplier,
    batchInfo: null,
    contractInfo: null,
  };
}

// ============================================================================
// Batch Order Creation
// ============================================================================

let _batchIdCounter = 0;

function generateBatchId(rng: RNG): string {
  _batchIdCounter++;
  return `batch_${rng.nextInt(99999)}_${_batchIdCounter}`;
}

function generateOrderId(prefix: string, rng: RNG): string {
  return `${prefix}_${rng.nextInt(99999)}_${Date.now()}`;
}

/**
 * Create a batch parent order with N child orders (one per itemType).
 * Each child order has batchInfo linking to the parent parent.
 */
export function createBatchParent(params: {
  batchId?: string;
  itemTypes: ItemType[];
  deadline: number;
  createdAt: number;
  targetType: 'store' | 'retrieve';
  breachDamage: number;
  rng: RNG;
}): { parent: BatchOrderParent; children: Order[] } {
  const {
    batchId: providedBatchId,
    itemTypes,
    deadline,
    createdAt,
    targetType,
    breachDamage,
    rng,
  } = params;

  const batchId = providedBatchId ?? generateBatchId(rng);
  const parentId = generateOrderId('batch_parent', rng);
  const totalChildren = itemTypes.length;

  // Create children
  const children: Order[] = itemTypes.map((itemType, index) => {
    const childId = generateOrderId('batch_child', rng);

    const batchInfo: BatchInfo = {
      batchId,
      parentOrderId: parentId,
      childIndex: index,
      totalChildren,
    };

    return {
      id: childId,
      type: targetType,
      priority: 'normal',
      orderClass: 'batch',
      itemType,
      deadline,
      maxDeadline: deadline,
      createdAt,
      vipMultiplier: 1,
      batchInfo,
      contractInfo: null,
      sourceSlotKey: null,
    } satisfies Order;
  });

  const parent: BatchOrderParent = {
    id: parentId,
    batchId,
    createdAt,
    deadline,
    maxDeadline: deadline,
    children,
    childrenCompleted: 0,
    childrenTotal: totalChildren,
    itemTypes,
    targetType,
    breachDamage,
    vipMultiplier: 1,
  };

  return { parent, children };
}

// ============================================================================
// Contract Order Creation
// ============================================================================

/**
 * Create a contract order with orderClass='contract' and contractInfo.
 */
export function createContractOrder(params: {
  contractId: string;
  itemType: ItemType;
  deadline: number;
  breachDamage: number;
  reward: string;
  condition: string;
  createdAt: number;
  type: 'store' | 'retrieve';
}): Order {
  const {
    contractId,
    itemType,
    deadline,
    breachDamage,
    reward,
    condition,
    createdAt,
    type,
  } = params;

  const contractInfo: ContractInfo = {
    contractId,
    breachDamage,
    reward,
    condition,
  };

  const contractIdSuffix = Date.now() % 100000;
  return {
    id: `contract_${contractIdSuffix}`,
    type,
    priority: 'normal',
    orderClass: 'contract',
    itemType,
    deadline,
    maxDeadline: deadline,
    createdAt,
    vipMultiplier: 1,
    batchInfo: null,
    contractInfo,
    sourceSlotKey: null,
  } satisfies Order;
}

// ============================================================================
// Batch Completion Check
// ============================================================================

/**
 * Check if all batch children are done (completed).
 * Returns completion status and progress ratio [0, 1].
 */
export function checkBatchCompletion(
  parent: BatchOrderParent
): { complete: boolean; progress: number } {
  const complete = parent.childrenCompleted >= parent.childrenTotal;
  const progress =
    parent.childrenTotal > 0
      ? parent.childrenCompleted / parent.childrenTotal
      : 1;

  return { complete, progress };
}

// ============================================================================
// Breach Damage from Order (polymorphic dispatch)
// ============================================================================

/**
 * Determine breach damage for any order type.
 * - Batch parent: uses batch breachDamage property
 * - Contract order: uses contractInfo.breachDamage
 * - VIP / normal: uses getBreachDamage from types.ts
 */
export function getBreachDamageFromOrder(
  orderOrParent: Order | BatchOrderParent
): number {
  // Handle BatchOrderParent
  if ('children' in orderOrParent && 'breachDamage' in orderOrParent) {
    return (orderOrParent as BatchOrderParent).breachDamage;
  }

  const order = orderOrParent as Order;

  // Contract orders
  if (order.contractInfo) {
    return order.contractInfo.breachDamage;
  }

  // Standard orders (VIP / normal)
  return getBreachDamage(order);
}
