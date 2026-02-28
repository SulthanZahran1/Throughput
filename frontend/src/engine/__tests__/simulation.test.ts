import { describe, it, expect } from 'vitest';
import { createSimulationContext, tickSimulation, checkShiftEnd, calculateShiftScore, generateShiftResult } from '../simulation';
import { createGrid } from '../grid';
import { createRng } from '../rng';
import type { SimulationFlags } from '../types';

describe('Simulation', () => {
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

  describe('createSimulationContext', () => {
    it('should create context with correct initial state', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      expect(context.seed).toBe(12345);
      expect(context.shiftNumber).toBe(1);
      expect(context.difficulty).toBe('normal');
      expect(context.shiftTimeRemaining).toBe(120);
      expect(context.cranes).toHaveLength(1);
      expect(context.cranes[0].state).toBe('IDLE');
    });
    
    it('should create multiple cranes based on count', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 3,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      expect(context.cranes).toHaveLength(3);
      expect(context.cranes[0].id).toBe('crane-0');
      expect(context.cranes[1].id).toBe('crane-1');
      expect(context.cranes[2].id).toBe('crane-2');
    });
  });

  describe('tickSimulation', () => {
    it('should advance time', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      const result = tickSimulation(context, 1);
      
      expect(result.context.shiftTimeRemaining).toBe(119);
      expect(result.context.realTime).toBe(1);
    });
    
    it('should cap delta time', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      // Try to advance by 1 second, but max is 0.1
      const result = tickSimulation(context, 1, { maxDeltaTime: 0.1 });
      
      expect(result.deltaTime).toBe(0.1);
      expect(result.context.shiftTimeRemaining).toBe(119.9);
    });
    
    it('should emit SHIFT_END when time expires', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 5,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      const result = tickSimulation(context, 10);
      
      expect(result.events.some(e => e.type === 'SHIFT_END')).toBe(true);
      expect(result.context.shiftTimeRemaining).toBe(0);
    });
    
    it('should spawn orders over time', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 0 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 1, // Spawn every second
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      // Run for 5 seconds
      let currentContext = context;
      for (let i = 0; i < 5; i++) {
        const result = tickSimulation(currentContext, 1);
        currentContext = result.context;
      }
      
      // Should have spawned some orders
      expect(currentContext.orders.length).toBeGreaterThan(0);
    });
    
    it('should track stats correctly', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      // Run for a bit
      let currentContext = context;
      for (let i = 0; i < 10; i++) {
        const result = tickSimulation(currentContext, 0.1);
        currentContext = result.context;
      }
      
      // Stats should exist
      expect(currentContext.stats).toBeDefined();
      expect(typeof currentContext.stats.ordersCompleted).toBe('number');
      expect(typeof currentContext.stats.ordersFailed).toBe('number');
    });
  });

  describe('checkShiftEnd', () => {
    it('should detect time expiration', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 0,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      const result = checkShiftEnd(context);
      
      expect(result.ended).toBe(true);
      expect(result.reason).toBe('time');
    });
    
    it('should not end when time remaining', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 60,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      const result = checkShiftEnd(context);
      
      expect(result.ended).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  describe('calculateShiftScore', () => {
    it('should calculate base score', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      context.stats.ordersCompleted = 5;
      context.stats.vipOrdersCompleted = 2;
      context.shiftTimeRemaining = 30;
      
      const score = calculateShiftScore(context);
      
      // 5 * 100 + 2 * 50 + 30 * 10 = 500 + 100 + 300 = 900
      expect(score).toBe(900);
    });
    
    it('should not return negative score', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      context.stats.ordersFailed = 100;
      
      const score = calculateShiftScore(context);
      
      expect(score).toBe(0);
    });
  });

  describe('generateShiftResult', () => {
    it('should generate correct shift result', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 10 }, rng);
      
      const context = createSimulationContext(
        12345,
        1,
        'normal',
        grid,
        defaultFlags,
        {
          totalShiftTime: 120,
          orderSpawnRate: 5,
          orderDeadlineBase: 30,
          craneCount: 1,
          craneSpeed: 2,
          transferTime: 1,
        },
        rng
      );
      
      context.stats.ordersCompleted = 10;
      context.stats.ordersFailed = 2;
      context.stats.vipOrdersCompleted = 3;
      context.shiftTimeRemaining = 20;
      
      const result = generateShiftResult(context);
      
      expect(result.shiftNumber).toBe(1);
      expect(result.completed).toBe(true);
      expect(result.ordersCompleted).toBe(10);
      expect(result.ordersFailed).toBe(2);
      expect(result.vipOrdersCompleted).toBe(3);
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
