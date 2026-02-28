import { describe, it, expect } from 'vitest';
import { createCrane, isAvailable, isHolding, getCurrentKey, getEstimatedCompletionTime, tickCrane, createTransferJob, assignJob, CraneParams } from '../crane';
import { createGrid } from '../grid';
import { createRng } from '../rng';

describe('Crane', () => {
  const defaultParams: CraneParams = {
    id: 'crane-1',
    startX: 5,
    startY: 4,
    speed: 2,
    transferTime: 1,
  };

  describe('createCrane', () => {
    it('should create crane with correct initial state', () => {
      const crane = createCrane(defaultParams);
      
      expect(crane.id).toBe('crane-1');
      expect(crane.x).toBe(5);
      expect(crane.y).toBe(4);
      expect(crane.targetX).toBe(5);
      expect(crane.targetY).toBe(4);
      expect(crane.state).toBe('IDLE');
      expect(crane.heldItem).toBeNull();
      expect(crane.transferProgress).toBe(0);
      expect(crane.transferTime).toBe(1);
      expect(crane.currentJob).toBeNull();
    });
  });

  describe('createTransferJob', () => {
    it('should create a job with correct properties', () => {
      const job = createTransferJob('order-1', 'store', '1,0', '3,3', 'red');
      
      expect(job.orderId).toBe('order-1');
      expect(job.jobType).toBe('store');
      expect(job.sourceKey).toBe('1,0');
      expect(job.destKey).toBe('3,3');
      expect(job.expectedItemType).toBe('red');
      expect(job.phase).toBe('MOVING_TO_SOURCE');
    });
  });

  describe('assignJob', () => {
    it('should assign job to IDLE crane', () => {
      const crane = createCrane(defaultParams);
      const job = createTransferJob('order-1', 'store', '1,0', '3,3', 'red');
      
      const result = assignJob(crane, job);
      
      expect(result).toBe(true);
      expect(crane.currentJob).toBe(job);
      expect(crane.state).toBe('MOVING_TO_SOURCE');
      expect(crane.targetX).toBe(1); // source position
      expect(crane.targetY).toBe(0);
    });
    
    it('should fail to assign job to busy crane', () => {
      const crane = createCrane(defaultParams);
      const job1 = createTransferJob('order-1', 'store', '1,0', '3,3', 'red');
      const job2 = createTransferJob('order-2', 'retrieve', '2,2', '4,7', 'blue');
      
      assignJob(crane, job1);
      const result = assignJob(crane, job2);
      
      expect(result).toBe(false);
      expect(crane.currentJob).toBe(job1);
    });
    
    it('should fail to assign job to crane holding item', () => {
      const crane = createCrane(defaultParams);
      crane.heldItem = { id: 'item-1', type: 'red', storedAt: 0 };
      const job = createTransferJob('order-1', 'store', '1,0', '3,3', 'red');
      
      const result = assignJob(crane, job);
      
      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when IDLE and not holding', () => {
      const crane = createCrane(defaultParams);
      expect(isAvailable(crane)).toBe(true);
    });
    
    it('should return false when has job', () => {
      const crane = createCrane(defaultParams);
      const job = createTransferJob('order-1', 'store', '1,0', '3,3', 'red');
      assignJob(crane, job);
      
      expect(isAvailable(crane)).toBe(false);
    });
    
    it('should return false when holding item', () => {
      const crane = createCrane(defaultParams);
      crane.heldItem = { id: 'item-1', type: 'red', storedAt: 0 };
      expect(isAvailable(crane)).toBe(false);
    });
  });

  describe('isHolding', () => {
    it('should return false when empty', () => {
      const crane = createCrane(defaultParams);
      expect(isHolding(crane)).toBe(false);
    });
    
    it('should return true when holding item', () => {
      const crane = createCrane(defaultParams);
      crane.heldItem = { id: 'item-1', type: 'red', storedAt: 0 };
      expect(isHolding(crane)).toBe(true);
    });
  });

  describe('getCurrentKey', () => {
    it('should return current position as key', () => {
      const crane = createCrane(defaultParams);
      expect(getCurrentKey(crane)).toBe('5,4');
    });
  });

  describe('tickCrane', () => {
    it('should stay IDLE when no job', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 0 }, rng);
      const crane = createCrane(defaultParams);
      
      const result = tickCrane(crane, 1, grid, { 
        afterburners: false, overclocked: false, dualCommand: false,
        conveyorBelt: false, smartSorting: false, zoneMastery: false,
        vipClients: false, timeWarp: false, emergencyBrake: false,
        predictivePathing: false, blockedCells: 0, multiCrane: 1
      });
      
      expect(result).toBeNull();
      expect(crane.state).toBe('IDLE');
    });
    
    it('should move towards source when job assigned', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 0 }, rng);
      const crane = createCrane(defaultParams);
      const job = createTransferJob('order-1', 'store', '7,4', '3,3', 'red');
      
      // Place item at source
      grid.slots.get('7,4')!.item = { id: 'item-1', type: 'red', storedAt: 0 };
      
      assignJob(crane, job);
      
      tickCrane(crane, 0.5, grid, { 
        afterburners: false, overclocked: false, dualCommand: false,
        conveyorBelt: false, smartSorting: false, zoneMastery: false,
        vipClients: false, timeWarp: false, emergencyBrake: false,
        predictivePathing: false, blockedCells: 0, multiCrane: 1
      });
      
      expect(crane.x).toBeGreaterThan(5);
      expect(crane.state).toBe('MOVING_TO_SOURCE');
    });
    
    it('should arrive at source and start ACQUIRING', () => {
      const rng = createRng(12345);
      const grid = createGrid({ width: 10, height: 8, blockedCells: 0, initialInventory: 0 }, rng);
      const crane = createCrane({ ...defaultParams, startX: 5, startY: 4 });
      const job = createTransferJob('order-1', 'store', '6,4', '3,3', 'red');
      
      // Place item at source (1 cell away)
      grid.slots.get('6,4')!.item = { id: 'item-1', type: 'red', storedAt: 0 };
      
      assignJob(crane, job);
      
      // Move for enough time to arrive (1 cell at 2 cells/sec = 0.5s)
      tickCrane(crane, 0.6, grid, { 
        afterburners: false, overclocked: false, dualCommand: false,
        conveyorBelt: false, smartSorting: false, zoneMastery: false,
        vipClients: false, timeWarp: false, emergencyBrake: false,
        predictivePathing: false, blockedCells: 0, multiCrane: 1
      });
      
      expect(crane.state).toBe('ACQUIRING');
      expect(crane.transferProgress).toBe(0);
    });
    
    it('should complete ACQUIRING and transition to MOVING_TO_DEST', () => {
      const rng = createRng(12345);
      const gridParams = { width: 10, height: 8, blockedCells: 0, initialInventory: 0 };
      const grid = createGrid(gridParams, rng);
      
      // Setup: crane at source with item ready
      const storageKey = grid.storageSlots[0];
      const sourceKey = '5,4';
      
      const crane = createCrane({ ...defaultParams, startX: 5, startY: 4 });
      const job = createTransferJob('order-1', 'store', sourceKey, storageKey, 'red');
      
      // Place item at source
      grid.slots.get(sourceKey)!.item = { id: 'item-1', type: 'red', storedAt: 0 };
      
      assignJob(crane, job);
      
      // Force to ACQUIRING state
      crane.state = 'ACQUIRING';
      crane.transferProgress = 0;
      
      // Complete transfer
      const result = tickCrane(crane, 1, grid, { 
        afterburners: false, overclocked: false, dualCommand: false,
        conveyorBelt: false, smartSorting: false, zoneMastery: false,
        vipClients: false, timeWarp: false, emergencyBrake: false,
        predictivePathing: false, blockedCells: 0, multiCrane: 1
      });
      
      expect(result?.event).toBe('pickup_complete');
      expect(crane.state).toBe('MOVING_TO_DEST');
      expect(crane.heldItem).not.toBeNull();
    });
    
    it('should complete DEPOSITING and finish job', () => {
      const rng = createRng(12345);
      const gridParams = { width: 10, height: 8, blockedCells: 0, initialInventory: 0 };
      const grid = createGrid(gridParams, rng);
      
      const storageKey = grid.storageSlots[0];
      const storageSlot = grid.slots.get(storageKey)!;
      const sourceKey = '5,4';
      
      const crane = createCrane({ ...defaultParams, startX: storageSlot.x, startY: storageSlot.y });
      crane.heldItem = { id: 'item-1', type: 'red', storedAt: 0 };
      
      const job = createTransferJob('order-1', 'store', sourceKey, storageKey, 'red');
      crane.currentJob = job;
      crane.state = 'DEPOSITING';
      crane.transferProgress = 0;
      
      // Complete dropoff
      const result = tickCrane(crane, 1, grid, { 
        afterburners: false, overclocked: false, dualCommand: false,
        conveyorBelt: false, smartSorting: false, zoneMastery: false,
        vipClients: false, timeWarp: false, emergencyBrake: false,
        predictivePathing: false, blockedCells: 0, multiCrane: 1
      });
      
      expect(result?.event).toBe('dropoff_complete');
      expect(crane.state).toBe('IDLE');
      expect(crane.heldItem).toBeNull();
      expect(crane.currentJob).toBeNull();
      expect(storageSlot.item).not.toBeNull();
    });
  });

  describe('getEstimatedCompletionTime', () => {
    it('should return 0 when IDLE', () => {
      const crane = createCrane(defaultParams);
      expect(getEstimatedCompletionTime(crane, { afterburners: false })).toBe(0);
    });
    
    it('should estimate time for MOVING_TO_SOURCE crane', () => {
      const crane = createCrane(defaultParams);
      const job = createTransferJob('order-1', 'store', '7,4', '3,3', 'red');
      assignJob(crane, job);
      
      const time = getEstimatedCompletionTime(crane, { afterburners: false });
      
      // 2 cells at 2 cells/sec = 1 sec move + 1 sec transfer + move to dest + 1 sec transfer
      expect(time).toBeGreaterThan(1);
    });
  });
});
