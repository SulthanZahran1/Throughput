import type { RNG } from './rng';
import type { Grid, Slot, Zone, ItemType, CellKey } from './types';
import { toKey, ITEM_TYPES } from './types';

export interface GridParams {
  width: number;
  height: number;
  blockedCells: number;
  initialInventory: number;
  zoneCount?: number;
}

/**
 * Create a new grid with storage, input, and output areas
 */
export function createGrid(params: GridParams, rng: RNG): Grid {
  const { width, height, blockedCells, initialInventory, zoneCount = 3 } = params;
  
  const slots = new Map<CellKey, Slot>();
  const inputSlots: CellKey[] = [];
  const outputSlots: CellKey[] = [];
  const storageSlots: CellKey[] = [];
  
  // Define layout:
  // - Input area: top row (y = 0), center portion
  // - Output area: bottom row (y = height - 1), center portion  
  // - Storage area: everything else
  
  const inputStart = Math.floor(width * 0.25);
  const inputEnd = Math.floor(width * 0.75);
  const outputStart = Math.floor(width * 0.25);
  const outputEnd = Math.floor(width * 0.75);
  
  // Create all slots
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = toKey(x, y);
      let type: Slot['type'] = 'empty';
      
      // Determine slot type based on position
      if (y === 0 && x >= inputStart && x < inputEnd) {
        type = 'input';
        inputSlots.push(key);
      } else if (y === height - 1 && x >= outputStart && x < outputEnd) {
        type = 'output';
        outputSlots.push(key);
      } else if (y > 0 && y < height - 1) {
        type = 'storage';
        storageSlots.push(key);
      }
      
      slots.set(key, {
        key,
        x,
        y,
        type,
        item: null,
        zone: null,
      });
    }
  }
  
  const grid: Grid = {
    width,
    height,
    slots,
    inputSlots,
    outputSlots,
    storageSlots,
  };
  
  // Place blocked cells (only on storage slots)
  placeBlockedCells(grid, blockedCells, rng);
  
  // Create zones for smart sorting
  createZones(grid, zoneCount);
  
  // Place initial inventory
  placeInitialInventory(grid, initialInventory, rng);
  
  return grid;
}

/**
 * Place blocked cells randomly on storage slots
 */
function placeBlockedCells(grid: Grid, count: number, rng: RNG): void {
  const available = [...grid.storageSlots].filter(key => {
    const slot = grid.slots.get(key)!;
    return slot.type === 'storage' && !slot.item;
  });
  
  const toBlock = Math.min(count, available.length);
  const shuffled = rng.shuffle(available);
  
  for (let i = 0; i < toBlock; i++) {
    const key = shuffled[i];
    const slot = grid.slots.get(key)!;
    slot.type = 'blocked';
    // Remove from storage slots list
    const idx = grid.storageSlots.indexOf(key);
    if (idx !== -1) grid.storageSlots.splice(idx, 1);
  }
}

/**
 * Create zones for zone-priority storage
 */
function createZones(grid: Grid, zoneCount: number): Zone[] {
  const zones: Zone[] = [];
  const availableStorage = [...grid.storageSlots];
  
  if (availableStorage.length === 0 || zoneCount === 0) return zones;
  
  // Simple zone assignment: divide storage slots into roughly equal zones
  // based on x-coordinate (vertical stripes)
  
  const minX = Math.min(...availableStorage.map(k => grid.slots.get(k)!.x));
  const maxX = Math.max(...availableStorage.map(k => grid.slots.get(k)!.x));
  const xRange = maxX - minX + 1;
  const zoneWidth = Math.ceil(xRange / zoneCount);
  
  for (let z = 0; z < zoneCount; z++) {
    const zoneId = `zone-${z}`;
    const zoneStart = minX + z * zoneWidth;
    const zoneEnd = zoneStart + zoneWidth;
    
    const zoneCells = availableStorage.filter(key => {
      const slot = grid.slots.get(key)!;
      return slot.x >= zoneStart && slot.x < zoneEnd;
    });
    
    if (zoneCells.length > 0) {
      zones.push({
        id: zoneId,
        name: `Zone ${String.fromCharCode(65 + z)}`,  // A, B, C, ...
        cells: zoneCells,
        priority: z,  // Lower number = higher priority
      });
      
      // Assign zone to slots
      for (const key of zoneCells) {
        grid.slots.get(key)!.zone = zoneId;
      }
    }
  }
  
  return zones;
}

/**
 * Place initial inventory items randomly in storage
 */
function placeInitialInventory(grid: Grid, count: number, rng: RNG): void {
  const available = [...grid.storageSlots].filter(key => {
    const slot = grid.slots.get(key)!;
    return !slot.item && slot.type === 'storage';
  });
  
  const toPlace = Math.min(count, available.length);
  const shuffled = rng.shuffle(available);
  
  for (let i = 0; i < toPlace; i++) {
    const key = shuffled[i];
    const slot = grid.slots.get(key)!;
    const itemType = rng.nextItem(ITEM_TYPES);
    
    slot.item = {
      id: `initial-${i}`,
      type: itemType,
      storedAt: 0,
    };
  }
}

/**
 * Get all empty storage slots
 */
export function getEmptyStorageSlots(grid: Grid): CellKey[] {
  return grid.storageSlots.filter(key => {
    const slot = grid.slots.get(key)!;
    return !slot.item;
  });
}

/**
 * Get all slots containing items of a specific type
 */
export function getSlotsWithItemType(grid: Grid, itemType: ItemType): CellKey[] {
  return grid.storageSlots.filter(key => {
    const slot = grid.slots.get(key)!;
    return slot.item?.type === itemType;
  });
}

/**
 * Get the total inventory count per item type
 */
export function getInventoryCounts(grid: Grid): Map<ItemType, number> {
  const counts = new Map<ItemType, number>();
  
  for (const key of grid.storageSlots) {
    const slot = grid.slots.get(key)!;
    if (slot.item) {
      const type = slot.item.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
  }
  
  return counts;
}

/**
 * Check if a cell is walkable (not blocked)
 */
export type { Grid };

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  const key = toKey(x, y);
  const slot = grid.slots.get(key);
  if (!slot) return false;
  return slot.type !== 'blocked';
}

/**
 * Get adjacent cells (for pathfinding)
 */
export function getAdjacentCells(grid: Grid, x: number, y: number): Vec2[] {
  const adjacent: Vec2[] = [];
  const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  
  for (const dir of dirs) {
    const nx = x + dir.x;
    const ny = y + dir.y;
    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
      if (isWalkable(grid, nx, ny)) {
        adjacent.push({ x: nx, y: ny });
      }
    }
  }
  
  return adjacent;
}

// Import Vec2 for getAdjacentCells
import type { Vec2 } from './types';
