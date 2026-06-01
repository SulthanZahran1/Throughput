import type { ShiftParameters, SimulationFlags } from '../engine/types';

/**
 * 8-shift escalation table
 * Each shift gets progressively harder
 */
export interface EscalationEntry {
  shiftNumber: number;
  
  // Grid
  gridWidth: number;
  gridHeight: number;
  blockedCells: number;
  initialInventory: number;
  
  // Cranes
  craneCount: number;
  craneSpeed: number;
  transferTime: number;
  
  // Orders
  orderSpawnRate: number;  // Seconds between orders
  orderDeadlineBase: number;  // Base seconds for deadline
  vipOrderChance: number;
  
  // Time
  totalShiftTime: number;
}

export const ESCALATION_TABLE: EscalationEntry[] = [
  // Shift 1: Tutorial-ish
  {
    shiftNumber: 1,
    gridWidth: 8,
    gridHeight: 6,
    blockedCells: 0,
    initialInventory: 5,
    craneCount: 1,
    craneSpeed: 2,
    transferTime: 1,
    orderSpawnRate: 8,
    orderDeadlineBase: 40,
    vipOrderChance: 0,
    totalShiftTime: 90,
  },
  // Shift 2: Introduce blocked cells
  {
    shiftNumber: 2,
    gridWidth: 9,
    gridHeight: 7,
    blockedCells: 3,
    initialInventory: 8,
    craneCount: 1,
    craneSpeed: 2,
    transferTime: 1,
    orderSpawnRate: 7,
    orderDeadlineBase: 38,
    vipOrderChance: 0.1,
    totalShiftTime: 100,
  },
  // Shift 3: Faster orders
  {
    shiftNumber: 3,
    gridWidth: 10,
    gridHeight: 7,
    blockedCells: 5,
    initialInventory: 10,
    craneCount: 1,
    craneSpeed: 2,
    transferTime: 0.9,
    orderSpawnRate: 6,
    orderDeadlineBase: 35,
    vipOrderChance: 0.15,
    totalShiftTime: 110,
  },
  // Shift 4: Bigger grid
  {
    shiftNumber: 4,
    gridWidth: 12,
    gridHeight: 8,
    blockedCells: 8,
    initialInventory: 15,
    craneCount: 2,
    craneSpeed: 2,
    transferTime: 0.9,
    orderSpawnRate: 5.5,
    orderDeadlineBase: 32,
    vipOrderChance: 0.2,
    totalShiftTime: 120,
  },
  // Shift 5: Pressure on
  {
    shiftNumber: 5,
    gridWidth: 12,
    gridHeight: 9,
    blockedCells: 10,
    initialInventory: 18,
    craneCount: 2,
    craneSpeed: 2.2,
    transferTime: 0.85,
    orderSpawnRate: 5,
    orderDeadlineBase: 30,
    vipOrderChance: 0.25,
    totalShiftTime: 120,
  },
  // Shift 6: Expert level
  {
    shiftNumber: 6,
    gridWidth: 14,
    gridHeight: 9,
    blockedCells: 12,
    initialInventory: 22,
    craneCount: 2,
    craneSpeed: 2.2,
    transferTime: 0.8,
    orderSpawnRate: 4.5,
    orderDeadlineBase: 28,
    vipOrderChance: 0.3,
    totalShiftTime: 130,
  },
  // Shift 7: Hard mode
  {
    shiftNumber: 7,
    gridWidth: 14,
    gridHeight: 10,
    blockedCells: 15,
    initialInventory: 25,
    craneCount: 3,
    craneSpeed: 2.5,
    transferTime: 0.75,
    orderSpawnRate: 4,
    orderDeadlineBase: 25,
    vipOrderChance: 0.35,
    totalShiftTime: 130,
  },
  // Shift 8: Final boss
  {
    shiftNumber: 8,
    gridWidth: 16,
    gridHeight: 10,
    blockedCells: 18,
    initialInventory: 30,
    craneCount: 3,
    craneSpeed: 2.5,
    transferTime: 0.7,
    orderSpawnRate: 3.5,
    orderDeadlineBase: 22,
    vipOrderChance: 0.4,
    totalShiftTime: 140,
  },
];

/**
 * Get escalation entry for a shift
 */
export function getEscalation(shiftNumber: number): EscalationEntry {
  const entry = ESCALATION_TABLE.find(e => e.shiftNumber === shiftNumber);
  if (!entry) {
    // Return max difficulty for anything beyond 8
    return ESCALATION_TABLE[ESCALATION_TABLE.length - 1];
  }
  return entry;
}

/**
 * Generate shift parameters from escalation + upgrades + modifier
 */
export function generateShiftParameters(
  shiftNumber: number,
  seed: number,
  difficulty: 'normal' | 'hard' | 'brutal',
  heldUpgrades: string[],
  modifierId: string | null,
  flags: SimulationFlags
): ShiftParameters {
  const escalation = getEscalation(shiftNumber);
  
  // Apply difficulty pressure. Spawn rate and deadlines need separate tuning:
  // faster spawns create pressure, while tighter deadlines make that pressure matter.
  const layoutMultiplier = {
    normal: 1,
    hard: 1.2,
    brutal: 1.5,
  }[difficulty];

  const spawnMultiplier = {
    normal: 1,
    hard: 1.05,
    brutal: 1.2,
  }[difficulty];

  const deadlineDivisor = {
    normal: 1,
    hard: 1.12,
    brutal: 1.28,
  }[difficulty];

  const epRecoveryDifficultyMultiplier = {
    normal: 1,
    hard: 0.8,
    brutal: 0.6,
  }[difficulty];

  const stackCount = (id: string) => heldUpgrades.filter(heldId => heldId === id).length;
  const craneSpeedBonus = (flags.craneSpeedBonus ?? 0) || stackCount('faster_cranes_1') * 0.1;
  const transferTimeBonus = (flags.transferTimeBonus ?? 0) || stackCount('faster_transfer_1') * 0.1;
  const shiftTimeBonus = (flags.shiftTimeBonus ?? 0) || stackCount('more_time_1') * 10;
  const deadlineBonus = (flags.deadlineBonus ?? 0) || stackCount('slower_deadlines_1') * 0.1;
  
  const params: ShiftParameters = {
    shiftNumber,
    seed,
    difficulty,
    
    // Grid
    gridWidth: escalation.gridWidth,
    gridHeight: escalation.gridHeight,
    blockedCells: Math.floor(escalation.blockedCells * layoutMultiplier),
    initialInventory: escalation.initialInventory,
    
    // Cranes
    craneCount: flags.multiCrane || escalation.craneCount,
    craneSpeed: escalation.craneSpeed * (flags.afterburners ? 1.3 : 1) * (1 + craneSpeedBonus),
    transferTime: Math.max(0.35, escalation.transferTime * (1 - transferTimeBonus)),
    
    // Orders
    orderSpawnRate: escalation.orderSpawnRate / spawnMultiplier,
    orderDeadlineBase: (escalation.orderDeadlineBase / deadlineDivisor) * (1 + deadlineBonus),
    vipOrderChance: escalation.vipOrderChance,
    
    // Time
    totalShiftTime: escalation.totalShiftTime + shiftTimeBonus,
    
    // Modifier
    modifierId,
    
    // Flags applied from upgrades
    flags: {
      ...flags,
      epRecoveryMultiplier: (flags.epRecoveryMultiplier ?? 1) * epRecoveryDifficultyMultiplier,
    },
    retrievalMode: 'fifo', // TODO: Make configurable
  };
  
  return params;
}
