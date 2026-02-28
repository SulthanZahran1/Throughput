import type { RNG } from './rng';
import type { SimulationContext, SimulationEvent, TickResult, Crane, Order, ShiftResult, SimulationFlags, TransferJob, Item } from './types';
import { tickCrane, isAvailable, createTransferJob, assignJob, getCurrentKey } from './crane';
import type { Grid } from './grid';
import { findStorageSlot } from './storage';
import { findRetrievalSlot } from './retrieval';
import { trySpawnOrder, updateOrders, completeOrder, removeOrders, sortOrdersByPriority, canFulfillOrder } from './orders';

const HP_LOSS_PER_FAILED_ORDER = 1;

export interface SimulationConfig {
  targetFPS?: number;
  maxDeltaTime?: number; // Prevent spiral of death on lag
}

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
  rng: RNG
): SimulationContext {
  // Create cranes
  const cranes: Crane[] = [];
  for (let i = 0; i < params.craneCount; i++) {
    // Position cranes spaced out near the input area
    const x = Math.floor(grid.width * (0.2 + (i / Math.max(params.craneCount - 1, 1)) * 0.6));
    cranes.push({
      id: `crane-${i}`,
      x,
      y: 2, // Start near input
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
    zones: [], // TODO: Create zones from grid
    inventory: new Map(),
    flags,
    retrievalMode: 'fifo',
    orderSpawnRate: params.orderSpawnRate,
    orderDeadlineBase: params.orderDeadlineBase,
    lastOrderTime: -params.orderSpawnRate, // Allow immediate first order
    rng,
    stats: {
      ordersCompleted: 0,
      ordersFailed: 0,
      itemsStored: 0,
      itemsRetrieved: 0,
      vipOrdersCompleted: 0,
    },
  };
}

/**
 * Main simulation tick - advances the simulation by dt seconds
 */
export function tickSimulation(
  context: SimulationContext,
  dt: number,
  config: SimulationConfig = {}
): TickResult {
  const { maxDeltaTime = Infinity } = config;
  
  // Cap delta time to prevent spiral of death (if configured)
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
  
  // 2. Spawn new orders
  const newOrder = trySpawnOrder(context, events);
  if (newOrder) {
    context.orders.push(newOrder);
    context.lastOrderTime = context.realTime;
  }
  
  // 3. Update existing orders (deadlines)
  const { expiredOrders } = updateOrders(context, events, safeDt);
  
  // 4. Remove expired orders and apply HP loss
  if (expiredOrders.length > 0) {
    removeOrders(context, expiredOrders);
    events.push({
      type: 'HP_LOST',
      timestamp: context.realTime,
      data: { amount: expiredOrders.length * HP_LOSS_PER_FAILED_ORDER },
    });
  }
  
  // 5. Create jobs for orders that don't have one yet
  assignJobsToCranes(context);
  
  // 6. Tick all cranes
  for (const crane of context.cranes) {
    const result = tickCrane(crane, safeDt, context.grid, context.flags);
    
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
      
      // Track stats and complete orders
      handleDropoff(result.orderId, result.item, result.cellKey!, context, events);
    }
  }
  
  return { context, events, deltaTime: safeDt };
}

/**
 * Create and assign jobs to available cranes
 * Each job corresponds to one order and tracks the full lifecycle
 */
function assignJobsToCranes(context: SimulationContext): void {
  // First, handle orphaned cranes (holding items but job's order expired or invalid)
  for (const crane of context.cranes) {
    if (crane.state === 'IDLE' && crane.heldItem && crane.currentJob) {
      // Check if the job's order still exists
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
          // Create emergency storage job
          const orphanJob: TransferJob = {
            id: `orphan-${Date.now()}`,
            orderId: 'orphan-order',
            jobType: 'store',
            sourceKey: getCurrentKey(crane), // Current position
            destKey: storeKey,
            phase: 'MOVING_TO_DEST',
            expectedItemType: crane.heldItem.type,
          };
          
          crane.currentJob = orphanJob;
          crane.state = 'MOVING_TO_DEST';
          crane.movingAxis = null;  // Reset movement axis for new target
          const destSlot = context.grid.slots.get(storeKey)!;
          crane.targetX = destSlot.x;
          crane.targetY = destSlot.y;
        }
      } else if (crane.currentJob.phase === 'MOVING_TO_DEST') {
        // Valid job, continue to destination
        const destSlot = context.grid.slots.get(crane.currentJob.destKey);
        if (destSlot) {
          crane.state = 'MOVING_TO_DEST';
          crane.movingAxis = null;  // Reset movement axis for new target
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
    // Check if any crane already has a job for this order
    return !context.cranes.some(c => 
      c.currentJob?.orderId === order.id
    );
  });
  
  if (unassignedOrders.length === 0) return;
  
  // Sort by priority
  let sortedOrders = sortOrdersByPriority(unassignedOrders);
  
  // Assign jobs to available cranes
  for (const crane of availableCranes) {
    const order = findBestOrderForCrane(crane, sortedOrders, context);
    
    if (order) {
      const job = createJobForOrder(order, context, crane);
      if (job) {
        assignJob(crane, job);
        // Remove this order from the pool so it's not assigned to another crane
        sortedOrders = sortedOrders.filter(o => o.id !== order.id);
      }
    }
  }
}

/**
 * Create a TransferJob for an order
 */
function createJobForOrder(
  order: Order,
  context: SimulationContext,
  crane: Crane
): TransferJob | null {
  if (order.type === 'store') {
    // Find source (input slot with the item)
    let sourceKey = order.sourceSlotKey;
    
    // Validate source slot
    if (sourceKey) {
      const sourceSlot = context.grid.slots.get(sourceKey);
      if (!sourceSlot || !sourceSlot.item || sourceSlot.item.type !== order.itemType) {
        sourceKey = null;
      }
    }
    
    // Find alternative input slot
    if (!sourceKey) {
      sourceKey = context.grid.inputSlots.find(key => {
        const slot = context.grid.slots.get(key)!;
        return slot.item?.type === order.itemType;
      }) || null;
    }
    
    if (!sourceKey) return null;
    
    // Find destination (storage slot)
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
    
    // Destination is output area (use first output slot)
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

/**
 * Find the best order for a crane to handle
 */
function findBestOrderForCrane(
  _crane: Crane,
  orders: Order[],
  context: SimulationContext
): Order | null {
  for (const order of orders) {
    // Check if order can be fulfilled
    if (!canFulfillOrder(order, context.grid)) {
      continue;
    }
    
    return order;
  }
  
  return null;
}

/**
 * Handle a crane dropping off an item
 */
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
    
    // Find and complete retrieve order
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
      removeOrders(context, [retrieveOrder]);
    }
  }
}

/**
 * Check if shift should end (called after each tick)
 */
export function checkShiftEnd(context: SimulationContext): { ended: boolean; reason: 'time' | 'hp' | null } {
  if (context.shiftTimeRemaining <= 0) {
    return { ended: true, reason: 'time' };
  }
  
  // HP check would be done at run level
  return { ended: false, reason: null };
}

/**
 * Calculate shift score
 */
export function calculateShiftScore(context: SimulationContext): number {
  const { stats } = context;
  
  let score = 0;
  score += stats.ordersCompleted * 100;
  score += stats.vipOrdersCompleted * 50; // Bonus for VIP
  score -= stats.ordersFailed * 50;
  
  // Time bonus
  const timeBonus = Math.floor(context.shiftTimeRemaining * 10);
  score += timeBonus;
  
  return Math.max(0, score);
}

/**
 * Generate shift result
 */
export function generateShiftResult(context: SimulationContext): ShiftResult {
  return {
    shiftNumber: context.shiftNumber,
    completed: context.shiftTimeRemaining > 0,
    ordersCompleted: context.stats.ordersCompleted,
    ordersFailed: context.stats.ordersFailed,
    vipOrdersCompleted: context.stats.vipOrdersCompleted,
    hpLost: 0, // Tracked at run level
    hpRecovered: 0,
    score: calculateShiftScore(context),
    events: [], // Events are tracked separately
  };
}
