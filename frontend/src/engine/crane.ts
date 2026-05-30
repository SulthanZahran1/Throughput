import type { Crane, TransferJob, CellKey, Item, SimulationFlags } from './types';
import { fromKey, toKey } from './types';
import type { Grid } from './grid';

export interface CraneParams {
  id: string;
  startX: number;
  startY: number;
  speed: number;        // Cells per second
  transferTime: number; // Seconds to pick up or drop off
}

/**
 * Create a new crane
 */
export function createCrane(params: CraneParams): Crane {
  return {
    id: params.id,
    x: params.startX,
    y: params.startY,
    targetX: params.startX,
    targetY: params.startY,
    state: 'IDLE',
    movingAxis: null,
    heldItem: null,
    transferProgress: 0,
    transferTime: params.transferTime,
    currentJob: null,
  };
}

/**
 * Get crane speed (cells per second)
 */
function getCraneSpeed(crane: Crane, hasAfterburners: boolean, speedMultiplier: number = 1.0): number {
  const baseSpeed = 2;  // Base: 2 cells/sec
  let speed = baseSpeed;
  if (hasAfterburners) speed *= 1.3;
  speed *= speedMultiplier;  // Ability multiplier (turbo/core surge)
  return speed;
}

/**
 * Create a new transfer job
 */
export function createTransferJob(
  orderId: string,
  jobType: 'store' | 'retrieve',
  sourceKey: CellKey,
  destKey: CellKey,
  expectedItemType: string
): TransferJob {
  return {
    id: `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    orderId,
    jobType,
    sourceKey,
    destKey,
    phase: 'MOVING_TO_SOURCE',
    expectedItemType,
  };
}

/**
 * Assign a transfer job to a crane
 * Crane must be IDLE to receive a job
 */
export function assignJob(crane: Crane, job: TransferJob): boolean {
  if (crane.state !== 'IDLE' || crane.heldItem !== null) {
    return false; // Can't assign job if busy
  }
  
  crane.currentJob = job;
  crane.state = 'MOVING_TO_SOURCE';
  crane.movingAxis = null;  // Reset movement axis for new target
  
  // Set target to source
  const sourcePos = fromKey(job.sourceKey);
  crane.targetX = sourcePos.x;
  crane.targetY = sourcePos.y;
  
  return true;
}

/**
 * Check if crane is available for a new job
 */
export function isAvailable(crane: Crane): boolean {
  return crane.state === 'IDLE' && crane.heldItem === null && crane.currentJob === null;
}

/**
 * Check if crane is holding an item
 */
export function isHolding(crane: Crane): boolean {
  return crane.heldItem !== null;
}

/**
 * Get crane's current cell key
 */
export function getCurrentKey(crane: Crane): CellKey {
  return toKey(Math.round(crane.x), Math.round(crane.y));
}

/**
 * Move crane towards target using Manhattan/grid-based movement (no diagonals)
 * Cranes move horizontally first, then vertically
 * Returns true if arrived
 */
function moveTowards(crane: Crane, dt: number, speed: number): boolean {
  // Check if already at target
  const dx = crane.targetX - crane.x;
  const dy = crane.targetY - crane.y;
  
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    crane.x = crane.targetX;
    crane.y = crane.targetY;
    crane.movingAxis = null;
    return true; // Arrived
  }
  
  // Determine which axis to move on
  // Priority: X first, then Y (could be made configurable)
  if (crane.movingAxis === null) {
    crane.movingAxis = Math.abs(dx) > 0.001 ? 'x' : 'y';
  }
  
  const moveDistance = speed * dt;
  
  if (crane.movingAxis === 'x') {
    if (Math.abs(dx) > 0.001) {
      // Move horizontally
      const direction = dx > 0 ? 1 : -1;
      const distanceToTarget = Math.abs(dx);
      
      if (moveDistance >= distanceToTarget) {
        // Reached target X, snap to it and switch to Y axis
        crane.x = crane.targetX;
        crane.movingAxis = Math.abs(dy) > 0.001 ? 'y' : null;
      } else {
        crane.x += direction * moveDistance;
      }
    } else {
      // Already aligned on X, switch to Y
      crane.movingAxis = Math.abs(dy) > 0.001 ? 'y' : null;
    }
  } else if (crane.movingAxis === 'y') {
    if (Math.abs(dy) > 0.001) {
      // Move vertically
      const direction = dy > 0 ? 1 : -1;
      const distanceToTarget = Math.abs(dy);
      
      if (moveDistance >= distanceToTarget) {
        // Reached target Y, snap to it
        crane.y = crane.targetY;
        crane.movingAxis = null;
      } else {
        crane.y += direction * moveDistance;
      }
    } else {
      // Already aligned on Y, we're done
      crane.movingAxis = null;
    }
  }
  
  // Check if arrived after this move
  if (Math.abs(crane.targetX - crane.x) < 0.001 && Math.abs(crane.targetY - crane.y) < 0.001) {
    crane.x = crane.targetX;
    crane.y = crane.targetY;
    crane.movingAxis = null;
    return true;
  }
  
  return false; // Still moving
}

/**
 * Result of ticking a crane
 */
export interface TickCraneResult {
  event?: 'pickup_complete' | 'dropoff_complete' | 'job_complete';
  item?: Item;
  cellKey?: CellKey;
  orderId?: string;
}

/**
 * Tick a crane for one simulation step
 * Implements the FSM:
 *   IDLE -> (wait for job)
 *   MOVING_TO_SOURCE -> ACQUIRING (on arrival)
 *   ACQUIRING -> MOVING_TO_DEST (on transfer complete)
 *   MOVING_TO_DEST -> DEPOSITING (on arrival)
 *   DEPOSITING -> IDLE (on transfer complete, job done)
 */
export function tickCrane(
  crane: Crane,
  dt: number,
  grid: Grid,
  flags: SimulationFlags,
  speedMultiplier: number = 1.0
): TickCraneResult | null {
  const speed = getCraneSpeed(crane, flags.afterburners, speedMultiplier);
  
  switch (crane.state) {
    case 'IDLE': {
      // Nothing to do - wait for job assignment
      return null;
    }
    
    case 'MOVING_TO_SOURCE': {
      const arrived = moveTowards(crane, dt, speed);
      
      if (arrived) {
        // Start acquiring
        crane.state = 'ACQUIRING';
        crane.transferProgress = 0;
      }
      return null;
    }
    
    case 'ACQUIRING': {
      crane.transferProgress += dt / crane.transferTime;
      
      if (crane.transferProgress >= 1) {
        // Pickup complete - grab the item
        const job = crane.currentJob!;
        const slot = grid.slots.get(job.sourceKey);
        
        if (slot && slot.item) {
          crane.heldItem = slot.item;
          slot.item = null;
          
          // IMMEDIATELY transition to moving to destination
          // Never go IDLE while holding an item with a job
          crane.state = 'MOVING_TO_DEST';
          crane.transferProgress = 0;
          crane.movingAxis = null;  // Reset movement axis for new target
          
          const destPos = fromKey(job.destKey);
          crane.targetX = destPos.x;
          crane.targetY = destPos.y;
          
          return {
            event: 'pickup_complete',
            item: crane.heldItem,
            cellKey: job.sourceKey,
            orderId: job.orderId,
          };
        } else {
          // Item not found - cancel job
          crane.state = 'IDLE';
          crane.currentJob = null;
          crane.transferProgress = 0;
          return null;
        }
      }
      return null;
    }
    
    case 'MOVING_TO_DEST': {
      const arrived = moveTowards(crane, dt, speed);
      
      if (arrived) {
        // Start depositing
        crane.state = 'DEPOSITING';
        crane.transferProgress = 0;
      }
      return null;
    }
    
    case 'DEPOSITING': {
      crane.transferProgress += dt / crane.transferTime;
      
      if (crane.transferProgress >= 1) {
        // Dropoff complete
        const job = crane.currentJob!;
        const slot = grid.slots.get(job.destKey);
        const item = crane.heldItem;
        
        if (slot && item) {
          slot.item = item;
        }
        
        crane.heldItem = null;
        crane.transferProgress = 0;
        
        const result: TickCraneResult = {
          event: 'dropoff_complete',
          item: item || undefined,
          cellKey: job.destKey,
          orderId: job.orderId,
        };
        
        // Job is complete - go IDLE
        crane.state = 'IDLE';
        crane.currentJob = null;
        
        return result;
      }
      return null;
    }
  }
}

/**
 * Cancel current job and return crane to IDLE
 */
export function cancelJob(crane: Crane): void {
  crane.state = 'IDLE';
  crane.currentJob = null;
  crane.transferProgress = 0;
  crane.movingAxis = null;
  // Note: we don't drop heldItem - that needs special handling
}

/**
 * Safe Interruption Model
 *
 * A crane can be safely interrupted if:
 * - Not holding an item (heldItem === null)
 * - Not in DEPOSITING phase
 *
 * Interrupting means cancelling the current job and returning to IDLE.
 * The crane will then re-evaluate and pick a new job on the next assignment tick.
 */

/**
 * Check if a crane can be safely interrupted
 */
export function isCraneInterruptible(crane: Crane): boolean {
  // Cannot interrupt if holding an item
  if (crane.heldItem !== null) return false;
  // Cannot interrupt while depositing
  if (crane.state === 'DEPOSITING') return false;
  // IDLE cranes are already interruptible (no-op)
  if (crane.state === 'IDLE') return true;
  // MOVING_TO_SOURCE, ACQUIRING, MOVING_TO_DEST are safe to interrupt
  return true;
}

/**
 * Get all interruptible cranes from a list
 */
export function getInterruptibleCranes(cranes: Crane[]): Crane[] {
  return cranes.filter(c => isCraneInterruptible(c));
}

/**
 * Safely interrupt a crane's current job.
 * Crane returns to IDLE state ready for reassignment.
 * Does NOT drop held items (guards against unsafe interruption).
 * Returns true if interruption was performed, false if not allowed.
 */
export function interruptCrane(crane: Crane): boolean {
  if (!isCraneInterruptible(crane)) return false;

  crane.state = 'IDLE';
  crane.currentJob = null;
  crane.transferProgress = 0;
  crane.movingAxis = null;

  return true;
}

/**
 * Interrupt multiple cranes safely
 * Returns count of cranes actually interrupted
 */
export function interruptMultipleCranes(cranes: Crane[]): number {
  let count = 0;
  for (const crane of cranes) {
    if (interruptCrane(crane)) count++;
  }
  return count;
}

/**
 * Get estimated time to complete current job
 */
export function getEstimatedCompletionTime(
  crane: Crane,
  flags: { afterburners: boolean },
  speedMultiplier: number = 1.0
): number {
  if (crane.state === 'IDLE') return 0;
  
  const speed = getCraneSpeed(crane, flags.afterburners);
  let time = 0;
  
  // Time to finish current transfer (if any)
  if (crane.state === 'ACQUIRING' || crane.state === 'DEPOSITING') {
    time += crane.transferTime * (1 - crane.transferProgress);
  }
  
  // Time to move to current target
  if (crane.state === 'MOVING_TO_SOURCE' || crane.state === 'MOVING_TO_DEST') {
    const dx = crane.targetX - crane.x;
    const dy = crane.targetY - crane.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    time += distance / speed;
  }
  
  // If we're still going to do more phases, estimate those
  if (crane.state === 'MOVING_TO_SOURCE' || crane.state === 'ACQUIRING') {
    // Will need to move to dest after acquiring
    const job = crane.currentJob;
    if (job) {
      const sourcePos = fromKey(job.sourceKey);
      const destPos = fromKey(job.destKey);
      const distToDest = Math.abs(destPos.x - sourcePos.x) + Math.abs(destPos.y - sourcePos.y);
      time += distToDest / speed;
      time += crane.transferTime; // Deposit time
    }
  }
  
  return time;
}
