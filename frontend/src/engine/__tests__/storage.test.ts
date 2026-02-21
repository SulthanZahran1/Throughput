import { describe, it, expect } from 'vitest';
import { findBestStorageSlot } from '../storage';
import type { Grid, Item, Zone } from '../types';

function createGrid(width: number, height: number, ioPort = { x: 0, y: 0 }): Grid {
    const slots = new Map();
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            slots.set(`${x},${y}`, {
                x,
                y,
                state: 'empty' as const,
                item: null,
                zoneId: null,
            });
        }
    }
    return { width, height, slots, ioPort };
}

function createItem(type: string): Item {
    return {
        id: 'test-item',
        type: type as any,
        storedAt: 0,
    };
}

function createZone(
    id: string,
    cells: string[],
    acceptedItems: string[],
    priority: number
): Zone {
    return {
        id,
        name: `Zone ${id}`,
        color: '#ff0000',
        cells: new Set(cells),
        acceptedItems: acceptedItems as any,
        priority,
    };
}

describe('findBestStorageSlot', () => {
    it('should return null for a full grid', () => {
        const grid = createGrid(2, 2);
        // Fill all slots
        for (const [key, slot] of grid.slots) {
            grid.slots.set(key, { ...slot, state: 'occupied' });
        }
        
        const item = createItem('red');
        const result = findBestStorageSlot(item, grid, []);
        
        expect(result).toBeNull();
    });

    it('should store in zone that accepts the item', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const zones: Zone[] = [
            createZone('z1', ['1,1', '1,2'], ['red'], 5),
            createZone('z2', ['2,2', '2,3'], ['blue'], 5),
        ];

        const redItem = createItem('red');
        const result = findBestStorageSlot(redItem, grid, zones);

        expect(result).not.toBeNull();
        expect(['1,1', '1,2']).toContain(`${result!.x},${result!.y}`);
    });

    it('should prefer higher priority zones', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const zones: Zone[] = [
            createZone('z1', ['3,3'], ['red'], 5),
            createZone('z2', ['1,1'], ['red'], 10), // Higher priority
        ];

        const redItem = createItem('red');
        const result = findBestStorageSlot(redItem, grid, zones);

        expect(result).not.toBeNull();
        expect(result!.x).toBe(1);
        expect(result!.y).toBe(1);
    });

    it('should pick closest slot to IO in a zone', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const zones: Zone[] = [
            createZone('z1', ['3,3', '1,1', '2,2'], ['red'], 5),
        ];

        const redItem = createItem('red');
        const result = findBestStorageSlot(redItem, grid, zones);

        expect(result).not.toBeNull();
        // Should pick (1,1) as it's closest to IO (0,0)
        expect(result!.x).toBe(1);
        expect(result!.y).toBe(1);
    });

    it('should fall back to unassigned slots when no zone matches', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const zones: Zone[] = [
            createZone('z1', ['3,3'], ['red'], 5),
        ];

        const greenItem = createItem('green'); // Not accepted by z1
        const result = findBestStorageSlot(greenItem, grid, zones);

        expect(result).not.toBeNull();
        // Should pick unassigned slot closest to IO
        expect(result!.x).toBe(0);
        expect(result!.y).toBe(0);
    });

    it('should skip occupied slots in zones', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        // Mark (1,1) as occupied
        grid.slots.set('1,1', {
            x: 1, y: 1,
            state: 'occupied',
            item: createItem('red'),
            zoneId: 'z1',
        });
        
        const zones: Zone[] = [
            createZone('z1', ['1,1', '1,2'], ['red'], 5),
        ];

        const redItem = createItem('red');
        const result = findBestStorageSlot(redItem, grid, zones);

        expect(result).not.toBeNull();
        expect(result!.x).toBe(1);
        expect(result!.y).toBe(2);
    });
});
