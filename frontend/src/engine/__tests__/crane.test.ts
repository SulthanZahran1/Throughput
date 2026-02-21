import { describe, it, expect } from 'vitest';
import {
    createCrane,
    calculateTravelTime,
    moveCrane,
    tickCrane,
    startStoreMission,
    startRetrieveMission,
} from '../crane';
import type { Grid } from '../types';

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

describe('createCrane', () => {
    it('should create crane at position with IDLE state', () => {
        const crane = createCrane(5, 5);

        expect(crane.x).toBe(5);
        expect(crane.y).toBe(5);
        expect(crane.state).toBe('IDLE');
        expect(crane.carrying).toBeNull();
        expect(crane.mission).toBeNull();
        expect(crane.busyTimeRemaining).toBe(0);
    });
});

describe('calculateTravelTime', () => {
    it('should calculate correct travel time for horizontal move', () => {
        const time = calculateTravelTime(0, 0, 3, 0, 3); // 3 cells at 3 cells/sec
        expect(time).toBe(1);
    });

    it('should calculate correct travel time for vertical move', () => {
        const time = calculateTravelTime(0, 0, 0, 6, 3); // 6 cells at 3 cells/sec
        expect(time).toBe(2);
    });

    it('should calculate correct travel time for diagonal move', () => {
        // Diagonal moves max(dx, dy)
        const time = calculateTravelTime(0, 0, 3, 3, 3); // max(3,3) = 3 cells
        expect(time).toBe(1);
    });

    it('should use default speed when not specified', () => {
        const time = calculateTravelTime(0, 0, 3, 0); // default speed is 3
        expect(time).toBe(1);
    });
});

describe('moveCrane', () => {
    it('should set crane to MOVING state', () => {
        const crane = createCrane(0, 0);
        const moved = moveCrane(crane, { targetX: 3, targetY: 0 });

        expect(moved.state).toBe('MOVING');
        expect(moved.busyTimeRemaining).toBe(1); // 3 cells / 3 speed
    });

    it('should keep current position until arrival', () => {
        const crane = createCrane(0, 0);
        const moved = moveCrane(crane, { targetX: 5, targetY: 5 });

        expect(moved.x).toBe(0);
        expect(moved.y).toBe(0);
    });
});

describe('tickCrane', () => {
    it('should not change IDLE crane', () => {
        const crane = createCrane(0, 0);
        const result = tickCrane(crane, 0.1, { grid: createGrid(4, 4), onNeedStoreTarget: () => null });

        expect(result.crane.state).toBe('IDLE');
        expect(result.action).toBeUndefined();
    });

    it('should reduce busy time when MOVING', () => {
        const crane = moveCrane(createCrane(0, 0), { targetX: 3, targetY: 0 });
        expect(crane.busyTimeRemaining).toBe(1);

        const result = tickCrane(crane, 0.3, { grid: createGrid(4, 4), onNeedStoreTarget: () => null });

        expect(result.crane.state).toBe('MOVING');
        expect(result.crane.busyTimeRemaining).toBeCloseTo(0.7);
    });

    it('should transition to TRANSFERRING when move completes', () => {
        const crane = moveCrane(createCrane(0, 0), { targetX: 3, targetY: 0 });

        const result = tickCrane(crane, 1.1, { grid: createGrid(4, 4), onNeedStoreTarget: () => null });

        expect(result.crane.state).toBe('TRANSFERRING');
        expect(result.crane.x).toBe(3); // Position updated
        expect(result.crane.y).toBe(0);
        expect(result.action?.type).toBe('ARRIVED');
    });

    it('should stay BUSY when transferring', () => {
        const crane = moveCrane(createCrane(0, 0), { targetX: 3, targetY: 0 });
        const arrived = tickCrane(crane, 1.1, { grid: createGrid(4, 4), onNeedStoreTarget: () => null });

        expect(arrived.crane.state).toBe('TRANSFERRING');
        expect(arrived.crane.busyTimeRemaining).toBe(0.5); // ACTION_DELAY
    });
});

describe('startStoreMission', () => {
    it('should start mission from current position to IO', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const crane = createCrane(3, 3);

        const mission = startStoreMission(crane, grid);

        expect(mission.state).toBe('MOVING');
        expect(mission.mission?.type).toBe('STORE');
        expect(mission.mission?.targetX).toBe(0);
        expect(mission.mission?.targetY).toBe(0);
    });

    it('should immediately start transferring if already at IO', () => {
        const grid = createGrid(4, 4, { x: 0, y: 0 });
        const crane = createCrane(0, 0);

        const mission = startStoreMission(crane, grid);

        expect(mission.state).toBe('TRANSFERRING');
    });
});

describe('startRetrieveMission', () => {
    it('should start mission to target slot', () => {
        const crane = createCrane(0, 0);

        const mission = startRetrieveMission(crane, 3, 3);

        expect(mission.state).toBe('MOVING');
        expect(mission.mission?.type).toBe('RETRIEVE');
        expect(mission.mission?.targetX).toBe(3);
        expect(mission.mission?.targetY).toBe(3);
    });

    it('should immediately start transferring if already at target', () => {
        const crane = createCrane(2, 2);

        const mission = startRetrieveMission(crane, 2, 2);

        expect(mission.state).toBe('TRANSFERRING');
    });
});
