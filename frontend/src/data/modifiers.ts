import type { ModifierDefinition, ShiftParameters } from '../engine/types';

export const MODIFIERS: ModifierDefinition[] = [
  {
    id: 'power_outage',
    name: 'Power Outage',
    description: 'Cranes move 50% slower',
    icon: '⚡',
    apply: (params) => ({
      ...params,
      craneSpeed: params.craneSpeed * 0.5,
    }),
  },
  {
    id: 'overstock',
    name: 'Overstock',
    description: 'Grid is 30% full at start',
    icon: '📦',
    apply: (params) => ({
      ...params,
      initialInventory: Math.floor(params.gridWidth * params.gridHeight * 0.3),
    }),
  },
  {
    id: 'rushed',
    name: 'Rushed',
    description: 'Order deadlines are 30% shorter',
    icon: '⏱️',
    apply: (params) => ({
      ...params,
      orderDeadlineBase: params.orderDeadlineBase * 0.7,
    }),
  },
  {
    id: 'vip_day',
    name: 'VIP Day',
    description: '50% of orders are VIP',
    icon: '👑',
    apply: (params) => ({
      ...params,
      vipOrderChance: 0.5,
    }),
  },
  {
    id: 'understaffed',
    name: 'Understaffed',
    description: 'Only 1 crane available',
    icon: '👤',
    apply: (params) => ({
      ...params,
      craneCount: 1,
    }),
  },
  {
    id: 'cluttered',
    name: 'Cluttered',
    description: '10 extra blocked cells',
    icon: '🚧',
    apply: (params) => ({
      ...params,
      blockedCells: params.blockedCells + 10,
    }),
  },
  {
    id: 'high_demand',
    name: 'High Demand',
    description: 'Orders spawn 50% faster',
    icon: '📈',
    apply: (params) => ({
      ...params,
      orderSpawnRate: params.orderSpawnRate * 0.5,
    }),
  },
  {
    id: 'quality_control',
    name: 'Quality Control',
    description: 'Transfers take 50% longer',
    icon: '🔍',
    apply: (params) => ({
      ...params,
      transferTime: params.transferTime * 1.5,
    }),
  },
  {
    id: 'double_time',
    name: 'Double Time',
    description: 'Shift is 50% shorter',
    icon: '2️⃣',
    apply: (params) => ({
      ...params,
      totalShiftTime: params.totalShiftTime * 0.5,
    }),
  },
];

/**
 * Get modifier by ID
 */
export function getModifier(id: string): ModifierDefinition | undefined {
  return MODIFIERS.find(m => m.id === id);
}

/**
 * Apply a modifier to shift parameters
 */
export function applyModifier(
  params: ShiftParameters,
  modifierId: string | null
): ShiftParameters {
  if (!modifierId) return params;
  
  const modifier = getModifier(modifierId);
  if (!modifier) return params;
  
  return modifier.apply(params);
}

/**
 * Get random modifier (excluding already used)
 */
export function getRandomModifier(
  usedModifiers: string[],
  rng: { nextItem: <T>(arr: T[]) => T }
): ModifierDefinition {
  const available = MODIFIERS.filter(m => !usedModifiers.includes(m.id));
  if (available.length === 0) {
    // All modifiers used, reset
    return rng.nextItem(MODIFIERS);
  }
  return rng.nextItem(available);
}
