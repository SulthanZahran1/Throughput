/**
 * Mulberry32 - Fast, seeded PRNG
 * Same seed = identical sequence of random numbers
 * Used for deterministic simulation and replayability
 */

export type RngState = number;

export interface RNG {
  state: RngState;
  nextFloat: () => number;      // [0, 1)
  nextInt: (max: number) => number;  // [0, max)
  nextIntRange: (min: number, max: number) => number;  // [min, max)
  nextItem: <T>(array: T[]) => T;
  nextWeighted: <T>(items: { item: T; weight: number }[]) => T;
  shuffle: <T>(array: T[]) => T[];
  fork: () => RNG;  // Create independent RNG from current state
}

/**
 * Create a new RNG from a seed
 */
export function createRng(seed: number): RNG {
  let state = seed >>> 0;  // Ensure unsigned 32-bit

  const next = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextFloat = (): number => next();

  const nextInt = (max: number): number => {
    if (max <= 0) return 0;
    return Math.floor(next() * max);
  };

  const nextIntRange = (min: number, max: number): number => {
    if (min >= max) return min;
    return min + nextInt(max - min);
  };

  const nextItem = <T>(array: T[]): T => {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[nextInt(array.length)];
  };

  const nextWeighted = <T>(items: { item: T; weight: number }[]): T => {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty weighted array');
    }
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let random = nextFloat() * totalWeight;
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1].item;
  };

  const shuffle = <T>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const fork = (): RNG => createRng(state);

  return {
    get state() { return state; },
    set state(s: RngState) { state = s >>> 0; },
    nextFloat,
    nextInt,
    nextIntRange,
    nextItem,
    nextWeighted,
    shuffle,
    fork,
  };
}

/**
 * Hash a string to a 32-bit seed
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash >>> 0;  // Convert to unsigned 32-bit
  }
  return hash || 1;  // Ensure non-zero seed
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
