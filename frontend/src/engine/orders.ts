import type { RNG } from './rng';
import type { Order, OrderType, SimulationContext, SimulationEvent, Grid } from './types';
import { ITEM_TYPES } from './types';
import { canRetrieve, getRetrievableCounts } from './retrieval';
import { canStore, getEmptySlotCount } from './storage';

export interface OrderParams {
  orderSpawnRate: number;     // Seconds between orders
  orderDeadlineBase: number;  // Base seconds for order deadline
  vipOrderChance: number;     // 0-1 chance for VIP order
}

let orderIdCounter = 0;

/**
 * Generate a unique order ID
 */
function generateOrderId(): string {
  return `order-${Date.now()}-${orderIdCounter++}`;
}

/**
 * Create a store order (item to store from input)
 * Also spawns the item in an available input slot
 */
function createStoreOrder(
  params: OrderParams,
  currentTime: number,
  grid: Grid,
  flags: { vipClients: boolean },
  rng: RNG
): Order | null {
  // Check if there's space to store
  if (!canStore(grid)) {
    return null;
  }
  
  // Find an available input slot
  const availableInputSlots = grid.inputSlots.filter(key => {
    const slot = grid.slots.get(key)!;
    return slot.item === null;
  });
  
  if (availableInputSlots.length === 0) {
    // No input slots available, can't create store order
    return null;
  }
  
  const isVip = flags.vipClients && rng.nextFloat() < params.vipOrderChance;
  const itemType = rng.nextItem(ITEM_TYPES);
  
  // Spawn item in a random available input slot
  const inputSlotKey = rng.nextItem(availableInputSlots);
  const inputSlot = grid.slots.get(inputSlotKey)!;
  const itemId = `input-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  inputSlot.item = {
    id: itemId,
    type: itemType,
    storedAt: currentTime,
  };
  
  const deadlineBase = params.orderDeadlineBase;
  const deadline = isVip ? deadlineBase * 0.7 : deadlineBase;  // VIP orders have shorter deadlines
  
  return {
    id: generateOrderId(),
    type: 'store',
    priority: isVip ? 'vip' : 'normal',
    itemType,
    deadline,
    maxDeadline: deadline,
    createdAt: currentTime,
    vipMultiplier: isVip ? 1.5 : 1.0,
    sourceSlotKey: inputSlotKey,  // Track which input slot the item is in
  };
}

/**
 * Create a retrieve order (item to retrieve from storage)
 */
function createRetrieveOrder(
  params: OrderParams,
  currentTime: number,
  grid: Grid,
  flags: { vipClients: boolean },
  rng: RNG
): Order | null {
  // Find what item types are available
  const retrievable = getRetrievableCounts(grid);
  const availableTypes = Array.from(retrievable.entries())
    .filter(([, count]) => count > 0)
    .map(([type]) => type);
  
  if (availableTypes.length === 0) {
    return null;
  }
  
  const isVip = flags.vipClients && rng.nextFloat() < params.vipOrderChance;
  const itemType = rng.nextItem(availableTypes);
  
  const deadlineBase = params.orderDeadlineBase;
  const deadline = isVip ? deadlineBase * 0.7 : deadlineBase;
  
  return {
    id: generateOrderId(),
    type: 'retrieve',
    priority: isVip ? 'vip' : 'normal',
    itemType,
    deadline,
    maxDeadline: deadline,
    createdAt: currentTime,
    vipMultiplier: isVip ? 1.5 : 1.0,
    sourceSlotKey: null,  // Will be resolved when assigned
  };
}

/**
 * Decide whether to create a store or retrieve order
 * Balances the storage to prevent gridlock
 */
function decideOrderType(
  grid: Grid,
  _currentOrders: Order[],
  storeRatio: number,
  rng: RNG
): OrderType {
  const emptySlots = getEmptySlotCount(grid);
  const totalStorage = grid.storageSlots.length;
  const utilization = 1 - (emptySlots / totalStorage);
  
  // If grid is getting full, prioritize retrieval
  if (utilization > 0.9) return 'retrieve';
  
  // If grid is empty, prioritize storage
  if (utilization < 0.1) return 'store';
  
  // Otherwise, use ratio with some randomness
  const adjustedRatio = storeRatio * (1 - utilization * 0.5);  // Less store as we fill up
  
  return rng.nextFloat() < adjustedRatio ? 'store' : 'retrieve';
}

/**
 * Try to spawn a new order
 */
export function trySpawnOrder(
  context: SimulationContext,
  events: SimulationEvent[]
): Order | null {
  const { flags, orderSpawnRate, lastOrderTime, realTime, grid, orders, rng } = context;
  const orderDeadlineBase =
    typeof context.orderDeadlineBase === 'number'
      ? context.orderDeadlineBase
      : (context as SimulationContext & {
          shiftParameters?: { orderDeadlineBase?: number };
        }).shiftParameters?.orderDeadlineBase ?? 30;
  
  // Check if enough time has passed
  if (realTime - lastOrderTime < orderSpawnRate) {
    return null;
  }
  
  // Limit total orders to prevent overwhelming the player
  if (orders.length >= 10) {
    return null;
  }
  
  // Decide order type
  const orderType = decideOrderType(grid, orders, 0.6, rng);  // 60% store preference
  
  const orderParams: OrderParams = {
    orderSpawnRate,
    orderDeadlineBase,
    vipOrderChance: flags.vipClients ? 0.2 : 0,  // 20% VIP chance when enabled
  };
  
  let order: Order | null = null;
  
  if (orderType === 'store') {
    order = createStoreOrder(orderParams, realTime, grid, flags, rng);
  } else {
    order = createRetrieveOrder(orderParams, realTime, grid, flags, rng);
  }
  
  if (order) {
    events.push({
      type: 'ORDER_CREATED',
      timestamp: realTime,
      data: {
        orderId: order.id,
        orderType: order.type,
        itemType: order.itemType,
        priority: order.priority,
        deadline: order.deadline,
      },
    });
  }
  
  return order;
}

/**
 * Update order deadlines and check for expired orders
 */
export function updateOrders(
  context: SimulationContext,
  events: SimulationEvent[],
  dt: number
): { expiredOrders: Order[] } {
  const expiredOrders: Order[] = [];
  
  for (const order of context.orders) {
    // Update deadline
    order.deadline -= dt;
    
    // Check for expiration
    if (order.deadline <= 0) {
      expiredOrders.push(order);
      events.push({
        type: 'ORDER_FAILED',
        timestamp: context.realTime,
        data: {
          orderId: order.id,
          orderType: order.type,
          itemType: order.itemType,
          priority: order.priority,
        },
      });
    }
  }

  context.stats.ordersFailed += expiredOrders.length;
  
  return { expiredOrders };
}

/**
 * Complete an order
 */
export function completeOrder(
  order: Order,
  context: SimulationContext,
  events: SimulationEvent[]
): void {
  context.stats.ordersCompleted++;

  events.push({
    type: 'ORDER_COMPLETED',
    timestamp: context.realTime,
    data: {
      orderId: order.id,
      orderType: order.type,
      itemType: order.itemType,
      priority: order.priority,
      vipMultiplier: order.vipMultiplier,
    },
  });
  
  // Track VIP orders
  if (order.priority === 'vip') {
    context.stats.vipOrdersCompleted = (context.stats.vipOrdersCompleted || 0) + 1;
  }
}

/**
 * Remove orders from the active list
 */
export function removeOrders(
  context: SimulationContext,
  ordersToRemove: Order[]
): void {
  const idsToRemove = new Set(ordersToRemove.map(o => o.id));
  context.orders = context.orders.filter(o => !idsToRemove.has(o.id));
}

/**
 * Get order priority score (for prioritizing which order to handle next)
 */
export function getOrderPriorityScore(order: Order): number {
  // Higher score = higher priority
  const urgencyScore = (order.maxDeadline - order.deadline) / order.maxDeadline;
  const vipBonus = order.priority === 'vip' ? 0.5 : 0;
  
  return urgencyScore + vipBonus;
}

/**
 * Sort orders by priority (highest first)
 */
export function sortOrdersByPriority(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => getOrderPriorityScore(b) - getOrderPriorityScore(a));
}

/**
 * Get urgent orders (deadline below threshold)
 */
export function getUrgentOrders(orders: Order[], thresholdSeconds: number = 5): Order[] {
  return orders.filter(o => o.deadline <= thresholdSeconds);
}

/**
 * Check if order can be fulfilled
 */
export function canFulfillOrder(order: Order, grid: Grid): boolean {
  if (order.type === 'store') {
    return canStore(grid);
  } else {
    return canRetrieve(grid, order.itemType);
  }
}

/**
 * Get order statistics
 */
export function getOrderStats(orders: Order[]): {
  total: number;
  store: number;
  retrieve: number;
  vip: number;
  urgent: number;
} {
  return {
    total: orders.length,
    store: orders.filter(o => o.type === 'store').length,
    retrieve: orders.filter(o => o.type === 'retrieve').length,
    vip: orders.filter(o => o.priority === 'vip').length,
    urgent: getUrgentOrders(orders).length,
  };
}
