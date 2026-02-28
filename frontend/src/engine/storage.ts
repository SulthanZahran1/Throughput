import type { Grid, Zone, ItemType, CellKey, Item } from './types';
import type { RNG } from './rng';
import { getEmptyStorageSlots } from './grid';

/**
 * Find the best storage slot for an item
 * Supports smart sorting (zone-aware) and zone mastery
 */
export function findStorageSlot(
  grid: Grid,
  zones: Zone[],
  itemType: ItemType,
  flags: { smartSorting: boolean; zoneMastery: boolean },
  rng: RNG
): CellKey | null {
  const emptySlots = getEmptyStorageSlots(grid);
  
  if (emptySlots.length === 0) return null;
  
  // If zone mastery is active, try to store in zone matching item type
  if (flags.zoneMastery) {
    const preferredZone = getZoneForItemType(itemType, zones);
    if (preferredZone) {
      const zoneSlots = emptySlots.filter(key => {
        const slot = grid.slots.get(key)!;
        return slot.zone === preferredZone.id;
      });
      
      if (zoneSlots.length > 0) {
        // Pick a random slot in the preferred zone
        return rng.nextItem(zoneSlots);
      }
    }
  }
  
  // If smart sorting is active, use zone priority
  if (flags.smartSorting && zones.length > 0) {
    // Sort zones by priority (lower = higher priority)
    const sortedZones = [...zones].sort((a, b) => a.priority - b.priority);
    
    for (const zone of sortedZones) {
      const zoneSlots = emptySlots.filter(key => {
        const slot = grid.slots.get(key)!;
        return slot.zone === zone.id;
      });
      
      if (zoneSlots.length > 0) {
        // Pick a random slot in this zone
        return rng.nextItem(zoneSlots);
      }
    }
    
    // No zone slots available, fall back to any empty slot
    return rng.nextItem(emptySlots);
  }
  
  // No smart sorting - pick random empty slot
  return rng.nextItem(emptySlots);
}

/**
 * Get the preferred zone for an item type
 * Deterministic mapping based on item type index
 */
function getZoneForItemType(itemType: ItemType, zones: Zone[]): Zone | null {
  if (zones.length === 0) return null;
  
  const itemTypeIndex = [
    'red', 'blue', 'green', 'yellow',
    'purple', 'orange', 'cyan', 'magenta'
  ].indexOf(itemType);
  
  const zoneIndex = itemTypeIndex % zones.length;
  return zones[zoneIndex];
}

/**
 * Check if we can store more items
 */
export function canStore(grid: Grid): boolean {
  return getEmptyStorageSlots(grid).length > 0;
}

/**
 * Get storage utilization percentage
 */
export function getStorageUtilization(grid: Grid): number {
  const total = grid.storageSlots.length;
  if (total === 0) return 0;
  
  const used = grid.storageSlots.filter(key => {
    const slot = grid.slots.get(key)!;
    return slot.item !== null;
  }).length;
  
  return used / total;
}

/**
 * Get count of empty slots
 */
export function getEmptySlotCount(grid: Grid): number {
  return getEmptyStorageSlots(grid).length;
}

/**
 * Get count of occupied slots
 */
export function getOccupiedSlotCount(grid: Grid): number {
  return grid.storageSlots.filter(key => {
    const slot = grid.slots.get(key)!;
    return slot.item !== null;
  }).length;
}

/**
 * Check if a specific slot is available for storage
 */
export function isSlotAvailable(grid: Grid, cellKey: CellKey): boolean {
  const slot = grid.slots.get(cellKey);
  if (!slot) return false;
  return slot.type === 'storage' && !slot.item;
}

/**
 * Get zone statistics
 */
export function getZoneStats(grid: Grid, zone: Zone): {
  total: number;
  occupied: number;
  available: number;
  utilization: number;
} {
  const slots = zone.cells.map(key => grid.slots.get(key)!);
  const total = slots.length;
  const occupied = slots.filter(s => s.item !== null).length;
  
  return {
    total,
    occupied,
    available: total - occupied,
    utilization: total > 0 ? occupied / total : 0,
  };
}

/**
 * Find the least utilized zone (for load balancing)
 */
export function findLeastUtilizedZone(grid: Grid, zones: Zone[]): Zone | null {
  if (zones.length === 0) return null;
  
  let leastUtilized: Zone | null = null;
  let minUtilization = 1;
  
  for (const zone of zones) {
    const stats = getZoneStats(grid, zone);
    if (stats.utilization < minUtilization) {
      minUtilization = stats.utilization;
      leastUtilized = zone;
    }
  }
  
  return leastUtilized;
}

/**
 * Get all items in a zone
 */
export function getItemsInZone(grid: Grid, zone: Zone): Array<{ item: Item; cellKey: CellKey }> {
  return zone.cells
    .map(key => ({ key, slot: grid.slots.get(key)! }))
    .filter(({ slot }) => slot.item !== null)
    .map(({ key, slot }) => ({ item: slot.item!, cellKey: key }));
}

/**
 * Check if grid is full
 */
export function isGridFull(grid: Grid): boolean {
  return getEmptyStorageSlots(grid).length === 0;
}

/**
 * Get recommended storage slot for item (considers all factors)
 * Used by AI for optimal placement
 */
export function getOptimalStorageSlot(
  grid: Grid,
  zones: Zone[],
  itemType: ItemType,
  flags: { smartSorting: boolean; zoneMastery: boolean },
  cranePosition: { x: number; y: number },
  rng: RNG
): CellKey | null {
  // First try zone mastery
  if (flags.zoneMastery) {
    const preferredZone = getZoneForItemType(itemType, zones);
    if (preferredZone) {
      const zoneSlots = getEmptyStorageSlots(grid).filter(key => {
        const slot = grid.slots.get(key)!;
        return slot.zone === preferredZone.id;
      });
      
      if (zoneSlots.length > 0) {
        // Pick slot closest to crane
        return findClosestSlot(grid, zoneSlots, cranePosition) || rng.nextItem(zoneSlots);
      }
    }
  }
  
  // Fall back to standard storage slot finding
  return findStorageSlot(grid, zones, itemType, flags, rng);
}

/**
 * Find closest slot from a list to a position
 */
function findClosestSlot(
  grid: Grid,
  slots: CellKey[],
  position: { x: number; y: number }
): CellKey | null {
  if (slots.length === 0) return null;
  
  let closest = slots[0];
  let closestDist = Infinity;
  
  for (const key of slots) {
    const slot = grid.slots.get(key)!;
    const dist = Math.abs(slot.x - position.x) + Math.abs(slot.y - position.y);
    if (dist < closestDist) {
      closestDist = dist;
      closest = key;
    }
  }
  
  return closest;
}
