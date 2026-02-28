import type { UpgradeDefinition, SimulationFlags, UpgradeRarity, UpgradeCategory } from '../engine/types';

export const UPGRADES: UpgradeDefinition[] = [
  // === CRANE UPGRADES ===
  {
    id: 'afterburners',
    name: 'Afterburners',
    description: 'Cranes move 30% faster',
    rarity: 'common',
    category: 'crane',
    maxCount: 1,
    unlockCost: 0,
    prerequisites: [],
    appliesFlags: { afterburners: true },
  },
  {
    id: 'dual_command',
    name: 'Dual Command',
    description: 'Cranes can store and retrieve in one trip',
    rarity: 'rare',
    category: 'crane',
    maxCount: 1,
    unlockCost: 100,
    prerequisites: ['afterburners'],
    appliesFlags: { dualCommand: true },
  },
  {
    id: 'overclocked',
    name: 'Overclocked',
    description: '50% faster transfers, but 10% chance of failure',
    rarity: 'rare',
    category: 'crane',
    maxCount: 1,
    unlockCost: 150,
    prerequisites: ['afterburners'],
    appliesFlags: { overclocked: true },
  },
  {
    id: 'conveyor_belt',
    name: 'Conveyor Belt',
    description: 'Automatic item input from trucks',
    rarity: 'epic',
    category: 'crane',
    maxCount: 1,
    unlockCost: 300,
    prerequisites: ['dual_command'],
    appliesFlags: { conveyorBelt: true },
  },
  
  // === STORAGE UPGRADES ===
  {
    id: 'smart_sorting',
    name: 'Smart Sorting',
    description: 'Items are stored in zone-priority order',
    rarity: 'common',
    category: 'storage',
    maxCount: 1,
    unlockCost: 0,
    prerequisites: [],
    appliesFlags: { smartSorting: true },
  },
  {
    id: 'zone_mastery',
    name: 'Zone Mastery',
    description: 'Item types have preferred zones',
    rarity: 'rare',
    category: 'storage',
    maxCount: 1,
    unlockCost: 120,
    prerequisites: ['smart_sorting'],
    appliesFlags: { zoneMastery: true },
  },
  
  // === ORDER UPGRADES ===
  {
    id: 'vip_clients',
    name: 'VIP Clients',
    description: 'VIP orders spawn with higher rewards',
    rarity: 'common',
    category: 'orders',
    maxCount: 1,
    unlockCost: 0,
    prerequisites: [],
    appliesFlags: { vipClients: true },
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Order deadlines drain 25% slower',
    rarity: 'rare',
    category: 'orders',
    maxCount: 1,
    unlockCost: 150,
    prerequisites: ['vip_clients'],
    appliesFlags: { timeWarp: true },
  },
  {
    id: 'emergency_brake',
    name: 'Emergency Brake',
    description: 'One-time HP save when you would lose',
    rarity: 'epic',
    category: 'orders',
    maxCount: 1,
    unlockCost: 400,
    prerequisites: ['time_warp'],
    appliesFlags: { emergencyBrake: true },
  },
  {
    id: 'predictive_pathing',
    name: 'Predictive Pathing',
    description: 'Pre-reserve retrieval paths',
    rarity: 'rare',
    category: 'orders',
    maxCount: 1,
    unlockCost: 180,
    prerequisites: ['vip_clients'],
    appliesFlags: { predictivePathing: true },
  },
  
  // === STAT BOOSTS (Common, Stackable) ===
  {
    id: 'faster_cranes_1',
    name: 'Motor Tuning I',
    description: 'Cranes move 10% faster',
    rarity: 'common',
    category: 'crane',
    maxCount: 3,
    unlockCost: 50,
    prerequisites: [],
    appliesFlags: {},
  },
  {
    id: 'faster_transfer_1',
    name: 'Hydraulics I',
    description: 'Transfer time reduced by 10%',
    rarity: 'common',
    category: 'crane',
    maxCount: 3,
    unlockCost: 50,
    prerequisites: [],
    appliesFlags: {},
  },
  {
    id: 'more_time_1',
    name: 'Overtime I',
    description: 'Shift time +10 seconds',
    rarity: 'common',
    category: 'orders',
    maxCount: 3,
    unlockCost: 50,
    prerequisites: [],
    appliesFlags: {},
  },
  {
    id: 'slower_deadlines_1',
    name: 'Patience I',
    description: 'Order deadlines +10%',
    rarity: 'common',
    category: 'orders',
    maxCount: 3,
    unlockCost: 50,
    prerequisites: [],
    appliesFlags: {},
  },
  
  // === SPECIAL UPGRADES ===
  {
    id: 'second_crane',
    name: 'Second Crane',
    description: 'Deploy an additional crane',
    rarity: 'rare',
    category: 'crane',
    maxCount: 1,
    unlockCost: 250,
    prerequisites: ['afterburners'],
    appliesFlags: { multiCrane: 2 },
  },
  {
    id: 'third_crane',
    name: 'Third Crane',
    description: 'Deploy a third crane',
    rarity: 'epic',
    category: 'crane',
    maxCount: 1,
    unlockCost: 500,
    prerequisites: ['second_crane'],
    appliesFlags: { multiCrane: 3 },
  },
];

/**
 * Get upgrade by ID
 */
export function getUpgrade(id: string): UpgradeDefinition | undefined {
  return UPGRADES.find(u => u.id === id);
}

/**
 * Get all upgrades of a specific category
 */
export function getUpgradesByCategory(category: UpgradeCategory): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.category === category);
}

/**
 * Get all upgrades of a specific rarity
 */
export function getUpgradesByRarity(rarity: UpgradeRarity): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.rarity === rarity);
}

/**
 * Get starting upgrades (unlockCost === 0)
 */
export function getStartingUpgrades(): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.unlockCost === 0);
}

/**
 * Get unlockable upgrades (unlockCost > 0)
 */
export function getUnlockableUpgrades(): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.unlockCost > 0);
}

/**
 * Check if an upgrade's prerequisites are met
 */
export function arePrerequisitesMet(
  upgrade: UpgradeDefinition,
  unlockedIds: string[]
): boolean {
  return upgrade.prerequisites.every(prereq => unlockedIds.includes(prereq));
}

/**
 * Apply upgrades to simulation flags
 */
export function applyUpgradesToFlags(
  flags: Partial<SimulationFlags>,
  upgradeIds: string[]
): SimulationFlags {
  const result: SimulationFlags = {
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
    ...flags,
  };
  
  for (const id of upgradeIds) {
    const upgrade = getUpgrade(id);
    if (upgrade) {
      Object.assign(result, upgrade.appliesFlags);
    }
  }
  
  return result;
}
