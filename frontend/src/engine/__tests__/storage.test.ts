import { describe, it, expect } from 'vitest';
import { createGrid, GridParams } from '../grid';
import { createRng } from '../rng';
import { findStorageSlot, canStore, getStorageUtilization, getEmptySlotCount, getOccupiedSlotCount, isSlotAvailable, getZoneStats, isGridFull } from '../storage';
import type { Zone } from '../types';

describe('Storage', () => {
  const defaultParams: GridParams = {
    width: 10,
    height: 8,
    blockedCells: 0,
    initialInventory: 0,
    zoneCount: 3,
  };

  describe('findStorageSlot', () => {
    it('should find any empty slot with no flags', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      const zones: Zone[] = [];
      
      const slot = findStorageSlot(grid, zones, 'red', { smartSorting: false, zoneMastery: false }, rng);
      
      expect(slot).not.toBeNull();
      const slotData = grid.slots.get(slot!)!;
      expect(slotData.type).toBe('storage');
      expect(slotData.item).toBeNull();
    });
    
    it('should return null when grid is full', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 100 }, rng);
      const zones: Zone[] = [];
      
      const slot = findStorageSlot(grid, zones, 'red', { smartSorting: false, zoneMastery: false }, rng);
      
      expect(slot).toBeNull();
    });
  });

  describe('canStore', () => {
    it('should return true when space available', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(canStore(grid)).toBe(true);
    });
    
    it('should return false when full', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 100 }, rng);
      
      expect(canStore(grid)).toBe(false);
    });
  });

  describe('getStorageUtilization', () => {
    it('should return 0 for empty grid', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(getStorageUtilization(grid)).toBe(0);
    });
    
    it('should return correct utilization', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 10 }, rng);
      
      const utilization = getStorageUtilization(grid);
      expect(utilization).toBeGreaterThan(0);
      expect(utilization).toBeLessThanOrEqual(1);
    });
  });

  describe('getEmptySlotCount', () => {
    it('should count empty slots correctly', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      const emptyCount = getEmptySlotCount(grid);
      expect(emptyCount).toBe(grid.storageSlots.length);
    });
  });

  describe('getOccupiedSlotCount', () => {
    it('should count occupied slots correctly', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 10 }, rng);
      
      const occupiedCount = getOccupiedSlotCount(grid);
      expect(occupiedCount).toBe(10);
    });
  });

  describe('isSlotAvailable', () => {
    it('should return true for empty storage slot', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      const key = grid.storageSlots[0];
      
      expect(isSlotAvailable(grid, key)).toBe(true);
    });
    
    it('should return false for occupied slot', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 10 }, rng);
      
      // Find an occupied slot
      const occupiedKey = grid.storageSlots.find(key => {
        return grid.slots.get(key)!.item !== null;
      })!;
      
      expect(isSlotAvailable(grid, occupiedKey)).toBe(false);
    });
    
    it('should return false for blocked slot', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, blockedCells: 5 }, rng);
      
      // Find a blocked slot
      const blockedSlot = Array.from(grid.slots.values()).find(
        s => s.type === 'blocked'
      )!;
      
      expect(isSlotAvailable(grid, blockedSlot.key)).toBe(false);
    });
  });

  describe('isGridFull', () => {
    it('should return false when space available', () => {
      const rng = createRng(12345);
      const grid = createGrid(defaultParams, rng);
      
      expect(isGridFull(grid)).toBe(false);
    });
    
    it('should return true when full', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 100 }, rng);
      
      expect(isGridFull(grid)).toBe(true);
    });
  });

  describe('getZoneStats', () => {
    it('should calculate zone statistics', () => {
      const rng = createRng(12345);
      const grid = createGrid({ ...defaultParams, initialInventory: 10 }, rng);
      
      // Get zones from grid
      const zones = new Map<string, { cells: string[] }>();
      for (const key of grid.storageSlots) {
        const slot = grid.slots.get(key)!;
        if (slot.zone) {
          if (!zones.has(slot.zone)) {
            zones.set(slot.zone, { cells: [] });
          }
          zones.get(slot.zone)!.cells.push(key);
        }
      }
      
      if (zones.size > 0) {
        const zone = { id: 'zone-0', name: 'A', cells: zones.get('zone-0')?.cells || [], priority: 0 };
        const stats = getZoneStats(grid, zone);
        
        expect(stats.total).toBeGreaterThan(0);
        expect(stats.occupied + stats.available).toBe(stats.total);
        expect(stats.utilization).toBeGreaterThanOrEqual(0);
        expect(stats.utilization).toBeLessThanOrEqual(1);
      }
    });
  });
});
