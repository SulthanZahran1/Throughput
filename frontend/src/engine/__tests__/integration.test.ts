import { describe, it, expect } from 'vitest';
import { createSimulationContext, tickSimulation, generateShiftResult } from '../simulation';
import { createGrid } from '../grid';
import { createRng } from '../rng';
import { isAvailable, createTransferJob, assignJob } from '../crane';
import { findStorageSlot, canStore } from '../storage';
import { canRetrieve } from '../retrieval';
import { trySpawnOrder } from '../orders';
import type { SimulationFlags, Order, SimulationEvent } from '../types';

/**
 * Integration tests for the full simulation flow.
 * These tests verify that orders, cranes, storage, and retrieval
 * all work together correctly.
 */
describe('Integration Tests', () => {
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
    multiCrane: 1,
  };

  function createTestContext(params: {
    initialInventory?: number;
    craneCount?: number;
    orderSpawnRate?: number;
    flags?: Partial<SimulationFlags>;
  } = {}) {
    const rng = createRng(12345);
    const grid = createGrid({
      width: 10,
      height: 8,
      blockedCells: 0,
      initialInventory: params.initialInventory ?? 10,
    }, rng);

    const flags = { ...defaultFlags, ...params.flags };

    return createSimulationContext(
      12345,
      1,
      'normal',
      grid,
      flags,
      {
        totalShiftTime: 120,
        orderSpawnRate: params.orderSpawnRate ?? 5,
        orderDeadlineBase: 30,
        craneCount: params.craneCount ?? 1,
        craneSpeed: 2,
        transferTime: 1,
      },
      rng
    );
  }

  describe('Store Order Flow', () => {
    it('should spawn item in input slot when store order is created', () => {
      const context = createTestContext({ initialInventory: 0 });
      
      // Initially, no items in input slots
      const initialInputItems = context.grid.inputSlots.filter(key => {
        return context.grid.slots.get(key)!.item !== null;
      });
      expect(initialInputItems.length).toBe(0);
      
      // Run simulation until a store order spawns
      let storeOrder: Order | null = null;
      let attempts = 0;
      const events: SimulationEvent[] = [];
      
      while (!storeOrder && attempts < 100) {
        const result = tickSimulation(context, 0.1);
        events.push(...result.events);
        
        // Look for ORDER_CREATED events with store type
        const orderCreated = result.events.find(e => e.type === 'ORDER_CREATED' && e.data.orderType === 'store');
        if (orderCreated) {
          storeOrder = context.orders.find(o => o.id === orderCreated.data.orderId) || null;
        }
        attempts++;
      }
      
      // A store order should have been created
      expect(storeOrder).not.toBeNull();
      
      // Items should now spawn in input slots when store orders are created
      const inputItems = context.grid.inputSlots.filter(key => {
        return context.grid.slots.get(key)!.item !== null;
      });
      
      expect(inputItems.length).toBeGreaterThan(0);
    });

    it('should complete full store order lifecycle', () => {
      const context = createTestContext({ initialInventory: 0, orderSpawnRate: 1 });
      
      // Track order completion
      let ordersCompleted = 0;
      let ordersFailed = 0;
      
      // Run simulation for a while
      for (let i = 0; i < 200; i++) {
        const result = tickSimulation(context, 0.5);
        
        // Track completion
        ordersCompleted += result.events.filter(e => e.type === 'ORDER_COMPLETED').length;
        ordersFailed += result.events.filter(e => e.type === 'ORDER_FAILED').length;
        
        // Stop if shift ended
        if (result.events.some(e => e.type === 'SHIFT_END')) {
          break;
        }
      }

      expect(ordersCompleted + ordersFailed).toBeGreaterThan(0);
    });

    it('should complete store order from pickup to storage', () => {
      // Create context with no initial orders so we control the flow
      const context = createTestContext({ initialInventory: 0, orderSpawnRate: 999 });
      const crane = context.cranes[0];
      
      // Manually set up a store order scenario
      const storeSlot = findStorageSlot(
        context.grid,
        context.zones,
        'red',
        { smartSorting: false, zoneMastery: false },
        context.rng
      );
      expect(storeSlot).not.toBeNull();
      
      // Place item in input slot
      const inputKey = context.grid.inputSlots[0];
      const inputSlot = context.grid.slots.get(inputKey)!;
      inputSlot.item = { id: 'test-red-item', type: 'red', storedAt: 0 };
      
      // Create store order
      context.orders.push({
        id: 'test-store-order',
        type: 'store',
        priority: 'normal',
        itemType: 'red',
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: inputKey,
      });
      
      // Pre-assign the storage destination
      crane.reservedKey = storeSlot;
      
      // Run simulation until order completes
      let storeCompleted = false;
      let iterations = 0;
      const maxIterations = 500;
      
      while (iterations < maxIterations) {
        const result = tickSimulation(context, 0.2);
        iterations++;
        
        // Check if store order completed
        const completedStore = result.events.find(e => 
          e.type === 'ORDER_COMPLETED' && e.data.orderId === 'test-store-order'
        );
        
        if (completedStore) {
          storeCompleted = true;
          break;
        }
        
        // Safety: stop if shift ended
        if (result.events.some(e => e.type === 'SHIFT_END')) {
          break;
        }
      }
      
      expect(storeCompleted).toBe(true);
    });

    it('should assign crane to store order when available', () => {
      const context = createTestContext({ initialInventory: 0, orderSpawnRate: 1 });
      const crane = context.cranes[0];
      
      // Initially crane should be available
      expect(isAvailable(crane)).toBe(true);
      
      // Run until a store order spawns
      let attempts = 0;
      while (attempts < 50) {
        tickSimulation(context, 0.5);
        
        // Check if crane was assigned
        if (crane.currentJob !== null) {
          break;
        }
        attempts++;
      }
      
      // Crane should have been assigned an order
      expect(crane.currentJob).not.toBeNull();
    });
  });

  describe('Retrieve Order Flow', () => {
    it('should assign crane to retrieve order when item exists', () => {
      // Start with inventory, no new orders
      const context = createTestContext({ initialInventory: 10, orderSpawnRate: 999 });
      
      // Find an item type that exists in storage
      let targetItemType: Order['itemType'] | null = null;
      
      for (const key of context.grid.storageSlots) {
        const slot = context.grid.slots.get(key)!;
        if (slot.item) {
          targetItemType = slot.item.type;
          break;
        }
      }
      
      expect(targetItemType).not.toBeNull();
      
      // Clear any auto-generated orders
      context.orders = [];
      
      // Manually add a retrieve order
      context.orders.push({
        id: 'manual-retrieve-order',
        type: 'retrieve',
        priority: 'normal',
        itemType: targetItemType,
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      });
      
      // Run simulation until crane is assigned
      let craneAssigned = false;
      let iterations = 0;
      
      while (iterations < 100) {
        tickSimulation(context, 0.5);
        iterations++;
        
        // Check if crane was assigned the retrieve order
        const crane = context.cranes[0];
        if (crane.currentJob?.orderId === 'manual-retrieve-order') {
          craneAssigned = true;
          break;
        }
        
        // Stop if shift ended
        if (context.shiftTimeRemaining <= 0) {
          break;
        }
      }
      
      // Crane should have been assigned the retrieve order
      expect(craneAssigned).toBe(true);
    });
    
    it('should pick up item for retrieve order', () => {
      // Start with inventory, no new orders
      const context = createTestContext({ initialInventory: 10, orderSpawnRate: 999 });
      
      // Find an item type that exists in storage
      let targetItemType: Order['itemType'] | null = null;
      
      for (const key of context.grid.storageSlots) {
        const slot = context.grid.slots.get(key)!;
        if (slot.item) {
          targetItemType = slot.item.type;
          break;
        }
      }
      
      expect(targetItemType).not.toBeNull();
      
      // Clear any auto-generated orders
      context.orders = [];
      
      // Manually add a retrieve order
      context.orders.push({
        id: 'manual-retrieve-order',
        type: 'retrieve',
        priority: 'normal',
        itemType: targetItemType,
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      });
      
      // Run simulation until crane picks up the item
      // Note: With Manhattan movement (no diagonals), crane needs more time
      let itemPickedUp = false;
      let iterations = 0;
      
      while (iterations < 600) {
        const result = tickSimulation(context, 0.2);
        iterations++;
        
        // Check if item was picked up
        const pickupEvent = result.events.find(e => 
          e.type === 'CRANE_PICKUP' && e.data.itemType === targetItemType
        );
        
        if (pickupEvent || context.cranes[0].heldItem?.type === targetItemType) {
          itemPickedUp = true;
          break;
        }
        
        // Stop if shift ended
        if (context.shiftTimeRemaining <= 0) {
          break;
        }
      }
      
      // Crane should have picked up the item
      expect(itemPickedUp).toBe(true);
    });

    it('should not assign retrieve order when item type not in storage', () => {
      const context = createTestContext({ initialInventory: 0 });
      
      // No items in storage, so can't retrieve anything
      expect(canRetrieve(context.grid, 'red')).toBe(false);
      
      // Run simulation
      for (let i = 0; i < 50; i++) {
        tickSimulation(context, 0.5);
      }
      
      // Should only have store orders (or no orders if grid is full check fails)
      const retrieveOrders = context.orders.filter(o => o.type === 'retrieve');
      expect(retrieveOrders.length).toBe(0);
    });
  });

  describe('Crane Behavior', () => {
    it('should move crane to target position', () => {
      const context = createTestContext({ initialInventory: 10 });
      const crane = context.cranes[0];
      
      // Assign a job that requires movement
      const storageKey = context.grid.storageSlots[0];
      const inputKey = context.grid.inputSlots[0];
      
      // Place item in input
      context.grid.slots.get(inputKey)!.item = { id: 'test-item', type: 'red', storedAt: 0 };
      
      // Create a job
      const job = createTransferJob('test-order', 'store', inputKey, storageKey, 'red');
      assignJob(crane, job);
      
      // Tick until crane starts moving
      let moved = false;
      for (let i = 0; i < 50; i++) {
        tickSimulation(context, 0.1);
        if (crane.state !== 'IDLE') {
          moved = true;
          break;
        }
      }
      
      // Should have started moving
      expect(moved).toBe(true);
      expect(crane.state).toBe('MOVING_TO_SOURCE');
    });

    it('should handle multiple cranes independently', () => {
      const context = createTestContext({ initialInventory: 10, craneCount: 3 });
      
      expect(context.cranes).toHaveLength(3);
      
      // All cranes should have different positions
      const positions = context.cranes.map(c => ({ x: c.x, y: c.y }));
      const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
      
      // Should be spread out
      expect(uniquePositions.size).toBeGreaterThanOrEqual(2);
    });

    it('should not assign the same order to multiple cranes', () => {
      // This test verifies that each order is assigned to only one crane
      // Bug: When multiple cranes are available AND multiple orders exist,
      // all cranes could get assigned the same order because the order list
      // is never filtered after assignments
      const context = createTestContext({ initialInventory: 10, craneCount: 2, orderSpawnRate: 99999 });
      
      // Prevent auto-spawning by setting lastOrderTime far in the future
      context.lastOrderTime = 0;
      
      // Find 2 different item types that exist in storage
      const itemTypes: Array<{ type: string; sourceKey: string }> = [];
      for (const key of context.grid.storageSlots) {
        const slot = context.grid.slots.get(key)!;
        if (slot.item && !itemTypes.find(it => it.type === slot.item!.type)) {
          itemTypes.push({ type: slot.item.type, sourceKey: key });
          if (itemTypes.length >= 2) break;
        }
      }
      expect(itemTypes.length).toBe(2);
      
      // Add two retrieve orders
      context.orders.push({
        id: 'order-a',
        type: 'retrieve',
        priority: 'normal',
        itemType: itemTypes[0].type,
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: itemTypes[0].sourceKey,
      });
      
      context.orders.push({
        id: 'order-b',
        type: 'retrieve',
        priority: 'normal',
        itemType: itemTypes[1].type,
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: itemTypes[1].sourceKey,
      });
      
      // Single tick to trigger assignment
      tickSimulation(context, 0.1);
      
      // Get the order IDs assigned to each crane
      const assignedOrderIds = context.cranes
        .filter(c => c.currentJob)
        .map(c => c.currentJob!.orderId);
      
      // Both cranes should have been assigned
      expect(assignedOrderIds.length).toBe(2);
      
      // They should have DIFFERENT orders
      const uniqueOrderIds = new Set(assignedOrderIds);
      expect(uniqueOrderIds.size).toBe(2);
      expect(assignedOrderIds).toContain('order-a');
      expect(assignedOrderIds).toContain('order-b');
    });

    it('should assign different orders to different cranes', () => {
      const context = createTestContext({ initialInventory: 10, craneCount: 2, orderSpawnRate: 999 });
      
      // Clear any auto-generated orders
      context.orders = [];
      
      // Find item types that exist in storage
      const itemTypes: string[] = [];
      for (const key of context.grid.storageSlots) {
        const slot = context.grid.slots.get(key)!;
        if (slot.item && !itemTypes.includes(slot.item.type)) {
          itemTypes.push(slot.item.type);
          if (itemTypes.length >= 2) break;
        }
      }
      expect(itemTypes.length).toBeGreaterThanOrEqual(2);
      
      // Add two retrieve orders
      context.orders.push({
        id: 'order-1',
        type: 'retrieve',
        priority: 'normal',
        itemType: itemTypes[0],
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      });
      
      context.orders.push({
        id: 'order-2',
        type: 'retrieve',
        priority: 'normal',
        itemType: itemTypes[1],
        deadline: 100,
        maxDeadline: 100,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      });
      
      // Run simulation until cranes are assigned
      for (let i = 0; i < 10; i++) {
        tickSimulation(context, 0.5);
      }
      
      // Get the order IDs assigned to each crane
      const assignedOrderIds = context.cranes
        .filter(c => c.currentJob)
        .map(c => c.currentJob!.orderId);
      
      // Should have exactly 2 cranes assigned
      expect(assignedOrderIds.length).toBe(2);
      
      // The two cranes should have different orders
      const uniqueOrderIds = new Set(assignedOrderIds);
      expect(uniqueOrderIds.size).toBe(2);
    });

    it('should prevent crane assignment when holding item', () => {
      const context = createTestContext({ initialInventory: 10 });
      const crane = context.cranes[0];
      
      // Give crane an item
      crane.heldItem = { id: 'test-item', type: 'red', storedAt: 0 };
      
      // Should not be available
      expect(isAvailable(crane)).toBe(false);
    });
  });

  describe('Storage Management', () => {
    it('should track storage utilization correctly', () => {
      const context = createTestContext({ initialInventory: 10 });
      
      const utilization = context.grid.storageSlots.filter(key => {
        return context.grid.slots.get(key)!.item !== null;
      }).length / context.grid.storageSlots.length;
      
      expect(utilization).toBeGreaterThan(0);
    });

    it('should not allow storage when grid is full', () => {
      const context = createTestContext({ initialInventory: 100 });
      
      expect(canStore(context.grid)).toBe(false);
    });

    it('should find storage slot for new items', () => {
      const context = createTestContext({ initialInventory: 5 });
      
      const slot = findStorageSlot(
        context.grid,
        context.zones,
        'red',
        { smartSorting: false, zoneMastery: false },
        context.rng
      );
      
      expect(slot).not.toBeNull();
    });
  });

  describe('Order Priority', () => {
    it('should prioritize VIP orders', () => {
      const context = createTestContext({ 
        initialInventory: 10, 
        orderSpawnRate: 0.5,
        flags: { vipClients: true }
      });
      
      let vipOrderAssigned = false;
      
      // Run for a bit
      for (let i = 0; i < 100; i++) {
        tickSimulation(context, 0.5);
        
        // Check if any crane is working on a VIP order
        const vipOrders = context.orders.filter(o => o.priority === 'vip');
        if (vipOrders.length > 0) {
          // A VIP order exists
          const craneWorkingOnVip = context.cranes.some(c => {
            const order = context.orders.find(o => o.id === c.currentJob?.orderId);
            return order?.priority === 'vip';
          });
          
          if (craneWorkingOnVip) {
            vipOrderAssigned = true;
            break;
          }
        }
      }
      
      // VIP orders should be prioritized
      expect(vipOrderAssigned).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid order spawning', () => {
      const context = createTestContext({ 
        initialInventory: 10, 
        orderSpawnRate: 0.1 // Very fast
      });
      
      // Run for a bit
      for (let i = 0; i < 50; i++) {
        tickSimulation(context, 0.5);
      }
      
      // Should not exceed max orders
      expect(context.orders.length).toBeLessThanOrEqual(10);
    });

    it('should handle shift timeout correctly', () => {
      const context = createTestContext({ initialInventory: 10 });
      
      // Fast forward to end of shift
      const result = tickSimulation(context, 200);
      
      // Should have SHIFT_END event
      expect(result.events.some(e => e.type === 'SHIFT_END')).toBe(true);
      expect(result.context.shiftTimeRemaining).toBe(0);
    });

    it('should generate valid shift result', () => {
      const context = createTestContext({ initialInventory: 10 });
      
      // Run simulation
      for (let i = 0; i < 100; i++) {
        tickSimulation(context, 0.5);
      }
      
      const result = generateShiftResult(context);
      
      expect(result.shiftNumber).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(typeof result.ordersCompleted).toBe('number');
      expect(typeof result.ordersFailed).toBe('number');
    });
  });

  describe('Bug: Store Order Item Spawning', () => {
    it('store orders spawn items in input slots', () => {
      // This test verifies the fix for store order item spawning
      const context = createTestContext({ initialInventory: 0 });
      
      // Force spawn a store order by manipulating the order type decision
      // We'll manually create a store order scenario
      
      // Set up context for store order
      context.orderSpawnRate = 0; // Immediate spawn
      context.lastOrderTime = -100;
      
      // Try to spawn an order
      const events: SimulationEvent[] = [];
      
      // Mock the order type to always be store
      let attempts = 0;
      let foundStoreOrder = false;
      
      while (!foundStoreOrder && attempts < 20) {
        context.lastOrderTime = -100;
        const order = trySpawnOrder(context, events);
        
        if (order && order.type === 'store') {
          foundStoreOrder = true;
          
          // Check if item spawned in input
          const inputItems = context.grid.inputSlots.filter(key => {
            return context.grid.slots.get(key)!.item !== null;
          });
          
          // FIXED: item should be in input slot
          expect(inputItems.length).toBe(1);
          
          // Verify the item type matches the order
          const inputSlot = context.grid.slots.get(inputItems[0])!;
          expect(inputSlot.item!.type).toBe(order.itemType);
        }
        
        attempts++;
        context.orders = []; // Clear for retry
      }
      
      expect(foundStoreOrder).toBe(true);
    });

    it('should handle orphaned crane with expired order', () => {
      // Test that cranes with expired orders get cleaned up properly
      const context = createTestContext({ initialInventory: 10, orderSpawnRate: 999 });
      const crane = context.cranes[0];
      
      // Find a storage slot
      const storageKey = context.grid.storageSlots[0];
      
      // Manually set crane to hold an item with a stale job
      crane.heldItem = { id: 'test-item', type: 'red', storedAt: 0 };
      crane.currentJob = {
        id: 'stale-job',
        orderId: 'expired-order-id',
        jobType: 'store',
        sourceKey: '0,0',
        destKey: storageKey,
        phase: 'MOVING_TO_DEST',
        expectedItemType: 'red',
      };
      crane.state = 'IDLE';
      
      // The order doesn't exist in context.orders
      expect(context.orders.some(o => o.id === 'expired-order-id')).toBe(false);
      
      // Run simulation - crane should be reassigned to store the orphaned item
      let craneReassigned = false;
      for (let i = 0; i < 100; i++) {
        tickSimulation(context, 0.5);
        
        // Crane should eventually start moving to store the item
        if (crane.state === 'MOVING_TO_DEST') {
          craneReassigned = true;
          break;
        }
        
        // Or the item gets stored
        if (!crane.heldItem) {
          craneReassigned = true;
          break;
        }
      }
      
      expect(craneReassigned).toBe(true);
    });
  });
});
