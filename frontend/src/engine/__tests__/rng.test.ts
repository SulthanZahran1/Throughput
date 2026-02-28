import { describe, it, expect } from 'vitest';
import { createRng, stringToSeed, generateSeed } from '../rng';

describe('RNG', () => {
  describe('createRng', () => {
    it('should generate same sequence from same seed', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);
      
      const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
      const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());
      
      expect(seq1).toEqual(seq2);
    });
    
    it('should generate different sequence from different seeds', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(54321);
      
      const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
      const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());
      
      expect(seq1).not.toEqual(seq2);
    });
    
    it('should generate values in [0, 1)', () => {
      const rng = createRng(12345);
      
      for (let i = 0; i < 100; i++) {
        const val = rng.nextFloat();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
    
    it('should generate integers in range [0, max)', () => {
      const rng = createRng(12345);
      
      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });
    
    it('should handle nextInt with max 0', () => {
      const rng = createRng(12345);
      expect(rng.nextInt(0)).toBe(0);
    });
    
    it('should generate integers in range [min, max)', () => {
      const rng = createRng(12345);
      
      for (let i = 0; i < 100; i++) {
        const val = rng.nextIntRange(5, 15);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(15);
        expect(Number.isInteger(val)).toBe(true);
      }
    });
    
    it('should pick items from array', () => {
      const rng = createRng(12345);
      const arr = ['a', 'b', 'c', 'd', 'e'];
      
      for (let i = 0; i < 50; i++) {
        const item = rng.nextItem(arr);
        expect(arr).toContain(item);
      }
    });
    
    it('should throw on empty array for nextItem', () => {
      const rng = createRng(12345);
      expect(() => rng.nextItem([])).toThrow('Cannot pick from empty array');
    });
    
    it('should pick weighted items', () => {
      const rng = createRng(12345);
      const items = [
        { item: 'common', weight: 70 },
        { item: 'rare', weight: 25 },
        { item: 'epic', weight: 5 },
      ];
      
      const counts = { common: 0, rare: 0, epic: 0 };
      
      for (let i = 0; i < 1000; i++) {
        const item = rng.nextWeighted(items);
        counts[item as keyof typeof counts]++;
      }
      
      // Common should be most frequent
      expect(counts.common).toBeGreaterThan(counts.rare);
      expect(counts.rare).toBeGreaterThan(counts.epic);
    });
    
    it('should throw on empty weighted array', () => {
      const rng = createRng(12345);
      expect(() => rng.nextWeighted([])).toThrow('Cannot pick from empty weighted array');
    });
    
    it('should shuffle array', () => {
      const rng = createRng(12345);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const shuffled = rng.shuffle(original);
      
      // Should contain same elements
      expect(shuffled).toHaveLength(original.length);
      expect(new Set(shuffled)).toEqual(new Set(original));
      
      // Order should likely be different (not guaranteed but highly probable)
      const different = shuffled.some((v, i) => v !== original[i]);
      expect(different).toBe(true);
    });
    
    it('should not mutate original array on shuffle', () => {
      const rng = createRng(12345);
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      
      rng.shuffle(original);
      
      expect(original).toEqual(copy);
    });
    
    it('should fork independent RNG', () => {
      const rng1 = createRng(12345);
      
      // Advance parent
      rng1.nextFloat();
      rng1.nextFloat();
      
      // Fork - should continue from current state
      const rng2 = rng1.fork();
      
      // Both should generate same sequence from fork point
      const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
      const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());
      
      expect(seq1).toEqual(seq2);
    });
    
    it('should expose state', () => {
      const rng = createRng(12345);
      
      const initialState = rng.state;
      rng.nextFloat();
      const newState = rng.state;
      
      expect(newState).not.toBe(initialState);
    });
    
    it('should allow setting state', () => {
      const rng1 = createRng(12345);
      const state = rng1.state;
      
      rng1.nextFloat();
      rng1.nextFloat();
      
      // Reset state
      rng1.state = state;
      
      const rng2 = createRng(12345);
      
      expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    });
  });
  
  describe('stringToSeed', () => {
    it('should convert string to consistent seed', () => {
      const seed1 = stringToSeed('hello');
      const seed2 = stringToSeed('hello');
      
      expect(seed1).toBe(seed2);
    });
    
    it('should produce different seeds for different strings', () => {
      const seed1 = stringToSeed('hello');
      const seed2 = stringToSeed('world');
      
      expect(seed1).not.toBe(seed2);
    });
    
    it('should produce valid 32-bit unsigned seed', () => {
      const seed = stringToSeed('any string');
      
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(4294967295);
    });
    
    it('should never return 0', () => {
      // Even empty string should produce non-zero
      expect(stringToSeed('')).not.toBe(0);
    });
  });
  
  describe('generateSeed', () => {
    it('should generate a seed', () => {
      const seed = generateSeed();
      
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
    });
    
    it('should generate different seeds', () => {
      const seeds = new Set();
      
      for (let i = 0; i < 100; i++) {
        seeds.add(generateSeed());
      }
      
      // Highly unlikely to get duplicates
      expect(seeds.size).toBeGreaterThan(90);
    });
  });
  
  describe('determinism', () => {
    it('should produce identical runs with same seed', () => {
      const seed = 123456789;
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);
      
      // Simulate a "run" - multiple random operations
      const run1 = [];
      const run2 = [];
      
      for (let i = 0; i < 100; i++) {
        run1.push({
          float: rng1.nextFloat(),
          int: rng1.nextInt(100),
          item: rng1.nextItem(['a', 'b', 'c']),
        });
        run2.push({
          float: rng2.nextFloat(),
          int: rng2.nextInt(100),
          item: rng2.nextItem(['a', 'b', 'c']),
        });
      }
      
      expect(run1).toEqual(run2);
    });
  });
});
