import { describe, it, expect } from 'vitest';
import { createGrid, GridParams } from '../grid';
import { createRng } from '../rng';
import { findRetrievalSlot, canRetrieve, getRetrievalCandidates, estimateRetrievalTime, getRetrievableCounts } from '../retrieval';
import { createCrane, CraneParams } from '../crane';

describe('Retrieval', () => {
  const defaultParams: GridParams = {
    width: 10,
    height: 8,
    blockedCells: 0,
    initialInventory: 10,
  };
  
  const craneParams: CraneParams = {
    id: 'crane-1',
    startX: 5,
    startY: 4,
    speed: 2,
    transferTime: 1,
  };

  describe('findRetrievalSlot', () => {
    it('should find slot with item type', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 20 }, rng);
      const crane = createCrane(craneParams);
      
      // First, check what item types are in the grid
      const retrievable = getRetrievableCounts(grid);
      const availableTypes = Array.from(retrievable.entries())
        .filter(([, count]) => count > 0)
        .map(([type]) => type);
      
      if (availableTypes.length > 0) {
        const itemType = availableTypes[0];
        const slot = findRetrievalSlot(grid, itemType, 'fifo', [], crane, rng);
        
        expect(slot).not.toBeNull();
        const slotData = grid.slots.get(slot!)!;
        expect(slotData.item?.type).toBe(itemType);
      }
    });
    
    it('should return null when item not in storage', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      const crane = createCrane(craneParams);
      
      const slot = findRetrievalSlot(grid, 'red', 'fifo', [], crane, rng);
      
      expect(slot).toBeNull();
    });
    
    it('should respect FIFO mode', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      
      // Manually place items with different storedAt times
      const slot1 = grid.storageSlots[0];
      const slot2 = grid.storageSlots[1];
      
      grid.slots.get(slot1)!.item = { id: 'item-1', type: 'red', storedAt: 100 };
      grid.slots.get(slot2)!.item = { id: 'item-2', type: 'red', storedAt: 50 };
      
      const crane = createCrane(craneParams);
      const found = findRetrievalSlot(grid, 'red', 'fifo', [], crane, rng);
      
      // FIFO should pick the oldest (lowest storedAt)
      expect(found).toBe(slot2);
    });
    
    it('should respect nearest mode', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      
      // Place items at different distances from crane
      const crane = createCrane({ ...craneParams, startX: 5, startY: 4 });
      
      // Find slots at specific distances
      let closeSlot: string | null = null;
      let farSlot: string | null = null;
      
      for (const key of grid.storageSlots) {
        const slot = grid.slots.get(key)!;
        const dist = Math.abs(slot.x - 5) + Math.abs(slot.y - 4);
        if (dist <= 2 && !closeSlot) closeSlot = key;
        if (dist >= 6 && !farSlot) farSlot = key;
      }
      
      if (closeSlot && farSlot) {
        grid.slots.get(closeSlot)!.item = { id: 'item-1', type: 'blue', storedAt: 0 };
        grid.slots.get(farSlot)!.item = { id: 'item-2', type: 'blue', storedAt: 0 };
        
        const found = findRetrievalSlot(grid, 'blue', 'nearest', [], crane, rng);
        expect(found).toBe(closeSlot);
      }
    });
  });

  describe('canRetrieve', () => {
    it('should return true when item available', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 10 }, rng);
      
      const retrievable = getRetrievableCounts(grid);
      const availableTypes = Array.from(retrievable.entries())
        .filter(([, count]) => count > 0)
        .map(([type]) => type);
      
      if (availableTypes.length > 0) {
        expect(canRetrieve(grid, availableTypes[0])).toBe(true);
      }
    });
    
    it('should return false when item not available', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      
      expect(canRetrieve(grid, 'red')).toBe(false);
    });
  });

  describe('getRetrievalCandidates', () => {
    it('should return all slots with item type', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      const crane = createCrane(craneParams);
      
      // Place multiple items of same type
      const slot1 = grid.storageSlots[0];
      const slot2 = grid.storageSlots[1];
      const slot3 = grid.storageSlots[2];
      
      grid.slots.get(slot1)!.item = { id: 'item-1', type: 'red', storedAt: 0 };
      grid.slots.get(slot2)!.item = { id: 'item-2', type: 'red', storedAt: 0 };
      grid.slots.get(slot3)!.item = { id: 'item-3', type: 'blue', storedAt: 0 };
      
      const candidates = getRetrievalCandidates(grid, 'red', 'fifo', crane);
      
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain(slot1);
      expect(candidates).toContain(slot2);
    });
    
    it('should sort by FIFO', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      const crane = createCrane(craneParams);
      
      const slot1 = grid.storageSlots[0];
      const slot2 = grid.storageSlots[1];
      
      grid.slots.get(slot1)!.item = { id: 'item-1', type: 'red', storedAt: 200 };
      grid.slots.get(slot2)!.item = { id: 'item-2', type: 'red', storedAt: 100 };
      
      const candidates = getRetrievalCandidates(grid, 'red', 'fifo', crane);
      
      // FIFO: oldest first (lowest storedAt)
      expect(candidates[0]).toBe(slot2);
      expect(candidates[1]).toBe(slot1);
    });
  });

  describe('estimateRetrievalTime', () => {
    it('should return Infinity when item not available', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      const crane = createCrane(craneParams);
      
      const time = estimateRetrievalTime(grid, 'red', 'fifo', crane, 2);
      
      expect(time).toBe(Infinity);
    });
    
    it('should estimate time for available item', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      const crane = createCrane({ ...craneParams, startX: 5, startY: 4 });
      
      // Place item nearby
      const slot = grid.storageSlots.find(key => {
        const s = grid.slots.get(key)!;
        return Math.abs(s.x - 5) + Math.abs(s.y - 4) <= 2;
      })!;
      
      grid.slots.get(slot)!.item = { id: 'item-1', type: 'red', storedAt: 0 };
      
      const time = estimateRetrievalTime(grid, 'red', 'fifo', crane, 2);
      
      expect(Number.isFinite(time)).toBe(true);
      expect(time).toBeGreaterThan(0);
    });
  });

  describe('getRetrievableCounts', () => {
    it('should count items by type', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 20 }, rng);
      
      const counts = getRetrievableCounts(grid);
      
      let total = 0;
      for (const count of counts.values()) {
        total += count;
      }
      
      expect(total).toBe(20);
    });
  });
});
