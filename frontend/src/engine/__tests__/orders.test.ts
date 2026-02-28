import { describe, it, expect } from 'vitest';
import { createGrid, GridParams } from '../grid';
import { createRng } from '../rng';
import { trySpawnOrder, updateOrders, completeOrder, removeOrders, getOrderPriorityScore, sortOrdersByPriority, getUrgentOrders, canFulfillOrder, getOrderStats } from '../orders';
import type { SimulationContext, Order, SimulationEvent } from '../types';

describe('Orders', () => {
  const gridParams: GridParams = {
    width: 10,
    height: 8,
    blockedCells: 0,
    initialInventory: 10,
  };

  function createTestContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
    const rng = createRng(12345);
    const grid = createGrid(gridParams, rng);
    
    return {
      seed: 12345,
      shiftNumber: 1,
      difficulty: 'normal',
      shiftTimeRemaining: 120,
      totalShiftTime: 120,
      realTime: 0,
      grid,
      cranes: [],
      orders: [],
      zones: [],
      inventory: new Map(),
      flags: {
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
      },
      retrievalMode: 'fifo',
      orderSpawnRate: 5,
      lastOrderTime: -10,
      rng,
      stats: {
        ordersCompleted: 0,
        ordersFailed: 0,
        itemsStored: 0,
        itemsRetrieved: 0,
        vipOrdersCompleted: 0,
      },
      shiftParameters: {
        orderDeadlineBase: 30,
      },
      ...overrides,
    } as SimulationContext;
  }

  describe('trySpawnOrder', () => {
    it('should spawn order when enough time passed', () => {
      const context = createTestContext({ lastOrderTime: -10, realTime: 0 });
      const events: SimulationEvent[] = [];
      
      const order = trySpawnOrder(context, events);
      
      expect(order).not.toBeNull();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ORDER_CREATED');
    });
    
    it('should not spawn order when not enough time passed', () => {
      const context = createTestContext({ lastOrderTime: 0, realTime: 2 });
      const events: SimulationEvent[] = [];
      
      const order = trySpawnOrder(context, events);
      
      expect(order).toBeNull();
    });
    
    it('should not spawn order when max orders reached', () => {
      const existingOrders = Array(10).fill(null).map((_, i) => ({
        id: `order-${i}`,
        type: 'store',
        priority: 'normal',
      })) as Order[];
      
      const context = createTestContext({ 
        orders: existingOrders,
        lastOrderTime: -10,
        realTime: 0,
      });
      const events: SimulationEvent[] = [];
      
      const order = trySpawnOrder(context, events);
      
      expect(order).toBeNull();
    });
    
    it('should spawn VIP orders when vipClients enabled', () => {
      const rng = createRng(12345);
      const grid = createGrid(gridParams, rng);
      const context = createTestContext({ 
        rng,
        grid,
        lastOrderTime: -10, 
        realTime: 0,
        flags: {
          dualCommand: false,
          afterburners: false,
          overclocked: false,
          conveyorBelt: false,
          smartSorting: false,
          zoneMastery: false,
          vipClients: true,
          timeWarp: false,
          emergencyBrake: false,
          predictivePathing: false,
          blockedCells: 0,
          multiCrane: 1,
        },
      });
      const events: SimulationEvent[] = [];
      
      // Spawn many orders to get some VIP
      let vipCount = 0;
      for (let i = 0; i < 50; i++) {
        context.lastOrderTime = -10;
        const order = trySpawnOrder(context, events);
        if (order?.priority === 'vip') vipCount++;
        context.orders = []; // Clear for next iteration
      }
      
      // Should have spawned some VIP orders
      expect(vipCount).toBeGreaterThan(0);
    });
  });

  describe('updateOrders', () => {
    it('should decrease order deadlines', () => {
      const context = createTestContext({
        orders: [
          { id: '1', type: 'store', priority: 'normal', itemType: 'red', deadline: 10, maxDeadline: 10, createdAt: 0, vipMultiplier: 1, sourceSlotKey: null },
        ] as Order[],
        realTime: 1,
      });
      const events: SimulationEvent[] = [];
      
      updateOrders(context, events, 2);
      
      expect(context.orders[0].deadline).toBe(8);
    });
    
    it('should detect expired orders', () => {
      const context = createTestContext({
        orders: [
          { id: '1', type: 'store', priority: 'normal', itemType: 'red', deadline: 1, maxDeadline: 10, createdAt: 0, vipMultiplier: 1, sourceSlotKey: null },
        ] as Order[],
        realTime: 2,
      });
      const events: SimulationEvent[] = [];
      
      const { expiredOrders } = updateOrders(context, events, 2);
      
      expect(expiredOrders).toHaveLength(1);
      expect(events[0].type).toBe('ORDER_FAILED');
    });
  });

  describe('completeOrder', () => {
    it('should emit ORDER_COMPLETED event', () => {
      const context = createTestContext({ realTime: 10 });
      const events: SimulationEvent[] = [];
      const order: Order = {
        id: '1',
        type: 'store',
        priority: 'normal',
        itemType: 'red',
        deadline: 5,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      };
      
      completeOrder(order, context, events);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ORDER_COMPLETED');
      expect(events[0].data.orderId).toBe('1');
    });
    
    it('should track VIP orders', () => {
      const context = createTestContext({ realTime: 10 });
      const events: SimulationEvent[] = [];
      const order: Order = {
        id: '1',
        type: 'store',
        priority: 'vip',
        itemType: 'red',
        deadline: 5,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1.5,
        sourceSlotKey: null,
      };
      
      completeOrder(order, context, events);
      
      expect(context.stats.vipOrdersCompleted).toBe(1);
    });
  });

  describe('removeOrders', () => {
    it('should remove specified orders', () => {
      const orders = [
        { id: '1', type: 'store' },
        { id: '2', type: 'retrieve' },
        { id: '3', type: 'store' },
      ] as Order[];
      
      const context = createTestContext({ orders });
      
      removeOrders(context, [orders[1]]);
      
      expect(context.orders).toHaveLength(2);
      expect(context.orders.map(o => o.id)).toEqual(['1', '3']);
    });
  });

  describe('getOrderPriorityScore', () => {
    it('should score urgent orders higher', () => {
      const urgentOrder: Order = {
        id: '1',
        type: 'store',
        priority: 'normal',
        itemType: 'red',
        deadline: 2,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      };
      
      const relaxedOrder: Order = {
        id: '2',
        type: 'store',
        priority: 'normal',
        itemType: 'blue',
        deadline: 8,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      };
      
      expect(getOrderPriorityScore(urgentOrder)).toBeGreaterThan(getOrderPriorityScore(relaxedOrder));
    });
    
    it('should score VIP orders higher', () => {
      const normalOrder: Order = {
        id: '1',
        type: 'store',
        priority: 'normal',
        itemType: 'red',
        deadline: 5,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1,
        sourceSlotKey: null,
      };
      
      const vipOrder: Order = {
        id: '2',
        type: 'store',
        priority: 'vip',
        itemType: 'blue',
        deadline: 5,
        maxDeadline: 10,
        createdAt: 0,
        vipMultiplier: 1.5,
        sourceSlotKey: null,
      };
      
      expect(getOrderPriorityScore(vipOrder)).toBeGreaterThan(getOrderPriorityScore(normalOrder));
    });
  });

  describe('sortOrdersByPriority', () => {
    it('should sort by priority descending', () => {
      const orders: Order[] = [
        { id: '1', deadline: 8, maxDeadline: 10, priority: 'normal' } as Order,
        { id: '2', deadline: 2, maxDeadline: 10, priority: 'normal' } as Order,
        { id: '3', deadline: 5, maxDeadline: 10, priority: 'vip' } as Order,
      ];
      
      const sorted = sortOrdersByPriority(orders);
      
      // VIP should be first, then most urgent
      expect(sorted[0].id).toBe('3');  // VIP
      expect(sorted[1].id).toBe('2');  // Most urgent
      expect(sorted[2].id).toBe('1');  // Least urgent
    });
  });

  describe('getUrgentOrders', () => {
    it('should return orders below threshold', () => {
      const orders: Order[] = [
        { id: '1', deadline: 10 } as Order,
        { id: '2', deadline: 3 } as Order,
        { id: '3', deadline: 1 } as Order,
      ];
      
      const urgent = getUrgentOrders(orders, 5);
      
      expect(urgent).toHaveLength(2);
      expect(urgent.map(o => o.id)).toContain('2');
      expect(urgent.map(o => o.id)).toContain('3');
    });
  });

  describe('canFulfillOrder', () => {
    it('should return true for store when space available', () => {
      const rng = createRng(12345);
      const grid = createGrid(gridParams, rng);
      const order: Order = { id: '1', type: 'store', itemType: 'red' } as Order;
      
      expect(canFulfillOrder(order, grid)).toBe(true);
    });
    
    it('should return true for retrieve when item available', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...gridParams, initialInventory: 10 }, rng);
      
      // Find a type that exists
      const retrievable = grid.storageSlots
        .map(key => grid.slots.get(key)!.item)
        .filter(Boolean);
      
      if (retrievable.length > 0) {
        const order: Order = { id: '1', type: 'retrieve', itemType: retrievable[0]!.type } as Order;
        expect(canFulfillOrder(order, grid)).toBe(true);
      }
    });
  });

  describe('getOrderStats', () => {
    it('should calculate order statistics', () => {
      const orders: Order[] = [
        { id: '1', type: 'store', priority: 'normal', deadline: 10 },
        { id: '2', type: 'retrieve', priority: 'vip', deadline: 2 },
        { id: '3', type: 'store', priority: 'normal', deadline: 5 },
      ] as Order[];
      
      const stats = getOrderStats(orders);
      
      expect(stats.total).toBe(3);
      expect(stats.store).toBe(2);
      expect(stats.retrieve).toBe(1);
      expect(stats.vip).toBe(1);
      expect(stats.urgent).toBe(2);  // deadline <= 5 (orders 2 and 3)
    });
  });
});
