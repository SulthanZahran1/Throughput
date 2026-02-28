import type { Grid, Order, ItemType, CellKey, Crane } from './types';
import { manhattanDistance, fromKey } from './types';
import type { RNG } from './rng';
import { getSlotsWithItemType } from './grid';

export type RetrievalMode = 'fifo' | 'deadline' | 'nearest';

/**
 * Find the best slot to retrieve an item from based on retrieval mode
 */
export function findRetrievalSlot(
  grid: Grid,
  itemType: ItemType,
  mode: RetrievalMode,
  activeOrders: Order[],
  crane: Crane,
  rng: RNG
): CellKey | null {
  const slots = getSlotsWithItemType(grid, itemType);
  
  if (slots.length === 0) return null;
  
  switch (mode) {
    case 'fifo':
      return findFIFOSlot(grid, slots);
      
    case 'deadline':
      return findDeadlineSlot(grid, slots, activeOrders, itemType);
      
    case 'nearest':
      return findNearestSlot(grid, slots, crane);
      
    default:
      return rng.nextItem(slots);
  }
}

/**
 * Find slot with oldest item (FIFO - First In First Out)
 */
function findFIFOSlot(grid: Grid, slots: CellKey[]): CellKey | null {
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0];
  
  let oldestSlot = slots[0];
  let oldestTime = Infinity;
  
  for (const key of slots) {
    const slot = grid.slots.get(key)!;
    const item = slot.item!;
    
    // Lower storedAt = stored earlier = older
    if (item.storedAt < oldestTime) {
      oldestTime = item.storedAt;
      oldestSlot = key;
    }
  }
  
  return oldestSlot;
}

/**
 * Find slot with item needed for most urgent order
 */
function findDeadlineSlot(
  grid: Grid,
  slots: CellKey[],
  activeOrders: Order[],
  itemType: ItemType
): CellKey | null {
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0];
  
  // Find the most urgent order needing this item type
  const relevantOrders = activeOrders.filter(o => 
    o.type === 'retrieve' && o.itemType === itemType
  );
  
  if (relevantOrders.length === 0) {
    // No specific order, fall back to FIFO
    return findFIFOSlot(grid, slots);
  }
  
  
  // Find closest slot to output area (assuming output is at bottom)
  // This minimizes travel time for urgent orders
  let bestSlot = slots[0];
  let bestScore = Infinity;
  
  for (const key of slots) {
    const slot = grid.slots.get(key)!;
    
    // Score: distance to bottom of grid (lower is better)
    // Combined with x-distance to center (output is usually centered)
    const centerX = grid.width / 2;
    const distToCenter = Math.abs(slot.x - centerX);
    const distToBottom = grid.height - slot.y;
    const score = distToBottom + distToCenter * 0.5;
    
    if (score < bestScore) {
      bestScore = score;
      bestSlot = key;
    }
  }
  
  return bestSlot;
}

/**
 * Find slot closest to the crane
 */
function findNearestSlot(
  _grid: Grid,
  slots: CellKey[],
  crane: Crane
): CellKey | null {
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0];
  
  let nearest = slots[0];
  let nearestDist = Infinity;
  
  const cranePos = { x: crane.x, y: crane.y };
  
  for (const key of slots) {
    const pos = fromKey(key);
    const dist = manhattanDistance(cranePos, pos);
    
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = key;
    }
  }
  
  return nearest;
}

/**
 * Pre-resolve retrieval slot for an order
 * This can be called when order is created to pre-allocate
 */
export function preResolveRetrieval(
  grid: Grid,
  order: Order,
  mode: RetrievalMode,
  activeOrders: Order[],
  crane: Crane,
  rng: RNG
): CellKey | null {
  if (order.type !== 'retrieve') return null;
  
  return findRetrievalSlot(
    grid,
    order.itemType,
    mode,
    activeOrders.filter(o => o.id !== order.id),
    crane,
    rng
  );
}

/**
 * Check if an item can be retrieved (exists in storage)
 */
export function canRetrieve(grid: Grid, itemType: ItemType): boolean {
  return getSlotsWithItemType(grid, itemType).length > 0;
}

/**
 * Get retrieval candidates for an item type
 * Returns slots sorted by preference based on mode
 */
export function getRetrievalCandidates(
  grid: Grid,
  itemType: ItemType,
  mode: RetrievalMode,
  crane: Crane
): CellKey[] {
  const slots = getSlotsWithItemType(grid, itemType);
  
  if (slots.length <= 1) return slots;
  
  switch (mode) {
    case 'fifo': {
      // Sort by storedAt (ascending - oldest first)
      return slots.sort((a, b) => {
        const itemA = grid.slots.get(a)!.item!;
        const itemB = grid.slots.get(b)!.item!;
        return itemA.storedAt - itemB.storedAt;
      });
    }
      
    case 'nearest': {
      // Sort by distance to crane
      const cranePos = { x: crane.x, y: crane.y };
      return slots.sort((a, b) => {
        const posA = fromKey(a);
        const posB = fromKey(b);
        const distA = manhattanDistance(cranePos, posA);
        const distB = manhattanDistance(cranePos, posB);
        return distA - distB;
      });
    }
      
    case 'deadline':
    default: {
      // Sort by distance to output (bottom-center)
      const centerX = grid.width / 2;
      return slots.sort((a, b) => {
        const slotA = grid.slots.get(a)!;
        const slotB = grid.slots.get(b)!;
        const scoreA = (grid.height - slotA.y) + Math.abs(slotA.x - centerX) * 0.5;
        const scoreB = (grid.height - slotB.y) + Math.abs(slotB.x - centerX) * 0.5;
        return scoreA - scoreB;
      });
    }
  }
}

/**
 * Calculate retrieval time estimate
 */
export function estimateRetrievalTime(
  grid: Grid,
  itemType: ItemType,
  mode: RetrievalMode,
  crane: Crane,
  craneSpeed: number
): number {
  const slots = getSlotsWithItemType(grid, itemType);
  if (slots.length === 0) return Infinity;
  
  // Get the most likely slot based on mode
  let targetSlot: CellKey;
  
  switch (mode) {
    case 'nearest':
      targetSlot = findNearestSlot(grid, slots, crane) || slots[0];
      break;
    case 'fifo':
      targetSlot = findFIFOSlot(grid, slots) || slots[0];
      break;
    case 'deadline':
    default:
      targetSlot = slots[0];
  }
  
  const pos = fromKey(targetSlot);
  const distToSlot = manhattanDistance({ x: crane.x, y: crane.y }, pos);
  const distToOutput = manhattanDistance(pos, { 
    x: Math.floor(grid.width / 2), 
    y: grid.height - 1 
  });
  
  const moveTime = (distToSlot + distToOutput) / craneSpeed;
  const transferTime = crane.transferTime * 2;  // Pickup + dropoff
  
  return moveTime + transferTime;
}

/**
 * Get count of retrievable items by type
 */
export function getRetrievableCounts(grid: Grid): Map<ItemType, number> {
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
