import { describe, it, expect } from 'vitest';
import { createGrid, getEmptyStorageSlots, getSlotsWithItemType, getInventoryCounts, isWalkable, GridParams } from '../grid';
import { createRng } from '../rng';

describe('Grid', () => {
  const defaultParams: GridParams = {
    width: 10,
    height: 8,
    blockedCells: 5,
    initialInventory: 10,
  };

  describe('createGrid', () => {
    it('should create grid with correct dimensions', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(grid.width).toBe(10);
      expect(grid.height).toBe(8);
    });
    
    it('should create input slots on top row', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(grid.inputSlots.length).toBeGreaterThan(0);
      
      for (const key of grid.inputSlots) {
        const slot = grid.slots.get(key)!;
        expect(slot.y).toBe(0);
        expect(slot.type).toBe('input');
      }
    });
    
    it('should create output slots on bottom row', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(grid.outputSlots.length).toBeGreaterThan(0);
      
      for (const key of grid.outputSlots) {
        const slot = grid.slots.get(key)!;
        expect(slot.y).toBe(grid.height - 1);
        expect(slot.type).toBe('output');
      }
    });
    
    it('should create storage slots in middle rows', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(grid.storageSlots.length).toBeGreaterThan(0);
      
      for (const key of grid.storageSlots) {
        const slot = grid.slots.get(key)!;
        expect(slot.y).toBeGreaterThan(0);
        expect(slot.y).toBeLessThan(grid.height - 1);
        expect(slot.type).toBe('storage');
      }
    });
    
    it('should place blocked cells', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      const blockedCount = Array.from(grid.slots.values()).filter(
        s => s.type === 'blocked'
      ).length;
      
      expect(blockedCount).toBe(defaultParams.blockedCells);
    });
    
    it('should place initial inventory', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      const inventoryCount = Array.from(grid.slots.values()).filter(
        s => s.item !== null
      ).length;
      
      expect(inventoryCount).toBe(defaultParams.initialInventory);
    });
    
    it('should be deterministic with same seed', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);
      
      const grid1 = createGrid(defaultParams, rng1);
      const grid2 = createGrid(defaultParams, rng2);
      
      // Check blocked cells are in same positions
      const blocked1 = Array.from(grid1.slots.values())
        .filter(s => s.type === 'blocked')
        .map(s => s.key)
        .sort();
      const blocked2 = Array.from(grid2.slots.values())
        .filter(s => s.type === 'blocked')
        .map(s => s.key)
        .sort();
      
      expect(blocked1).toEqual(blocked2);
    });
    
    it('should create zones', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, zoneCount: 3 }, rng);
      
      // Check that some slots have zone assignments
      const zonedSlots = Array.from(grid.slots.values()).filter(
        s => s.zone !== null && s.type === 'storage'
      );
      
      expect(zonedSlots.length).toBeGreaterThan(0);
    });
  });

  describe('getEmptyStorageSlots', () => {
    it('should return only empty storage slots', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      const empty = getEmptyStorageSlots(grid);
      
      for (const key of empty) {
        const slot = grid.slots.get(key)!;
        expect(slot.type).toBe('storage');
        expect(slot.item).toBeNull();
      }
    });
    
    it('should not include blocked cells', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      const empty = getEmptyStorageSlots(grid);
      
      for (const key of empty) {
        const slot = grid.slots.get(key)!;
        expect(slot.type).not.toBe('blocked');
      }
    });
  });

  describe('getSlotsWithItemType', () => {
    it('should find slots with specific item type', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 50 }, rng);
      
      const redSlots = getSlotsWithItemType(grid, 'red');
      
      for (const key of redSlots) {
        const slot = grid.slots.get(key)!;
        expect(slot.item?.type).toBe('red');
      }
    });
    
    it('should return empty array for missing type', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 0 }, rng);
      
      const slots = getSlotsWithItemType(grid, 'red');
      expect(slots).toEqual([]);
    });
  });

  describe('getInventoryCounts', () => {
    it('should count items correctly', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 20 }, rng);
      
      const counts = getInventoryCounts(grid);
      
      let total = 0;
      for (const count of counts.values()) {
        total += count;
      }
      
      expect(total).toBe(20);
    });
  });

  describe('isWalkable', () => {
    it('should return true for empty and storage slots', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      // Find a storage slot
      const storageKey = grid.storageSlots[0];
      const slot = grid.slots.get(storageKey)!;
      
      expect(isWalkable(grid, slot.x, slot.y)).toBe(true);
    });
    
    it('should return false for blocked slots', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      // Find a blocked slot
      const blockedSlot = Array.from(grid.slots.values()).find(
        s => s.type === 'blocked'
      );
      
      if (blockedSlot) {
        expect(isWalkable(grid, blockedSlot.x, blockedSlot.y)).toBe(false);
      }
    });
    
    it('should return false for out of bounds', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(isWalkable(grid, -1, 0)).toBe(false);
      expect(isWalkable(grid, 0, -1)).toBe(false);
      expect(isWalkable(grid, grid.width, 0)).toBe(false);
      expect(isWalkable(grid, 0, grid.height)).toBe(false);
    });
  });
});
