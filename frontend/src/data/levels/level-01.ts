// Level 1: First Day
// Tutorial: 6×6, 1 item type (Red), retrieve-only with pre-placed inventory

import type { LevelDefinition } from '../../types/level';

const level01: LevelDefinition = {
    id: '1',
    name: 'First Day',
    description: 'Your first shift. Learn the basics of retrieving items and fulfilling orders.',
    act: 1,

    // Small grid for tutorial
    gridWidth: 6,
    gridHeight: 6,
    ioPortPosition: { x: 0, y: 5 },

    // Only red items
    itemTypes: ['red'],

    // Pre-placed inventory for retrieve-only gameplay
    initialInventory: [
        { type: 'red', slot: { x: 1, y: 1 } },
        { type: 'red', slot: { x: 2, y: 1 } },
        { type: 'red', slot: { x: 3, y: 1 } },
        { type: 'red', slot: { x: 1, y: 2 } },
        { type: 'red', slot: { x: 2, y: 2 } },
    ],

    // 3 minute shift
    shiftDuration: 180,

    // Gentle order flow
    orderSchedule: [
        {
            startTime: 0,
            endTime: 180,
            ordersPerMinute: 2,
            itemDistribution: [{ type: 'red', weight: 1 }],
            timerRange: { min: 60, max: 60 }, // Generous 60s timers
        },
    ],

    // Easy survival
    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'orders_completed', value: 3 },
        two: { metric: 'orders_completed', value: 5 },
        three: { metric: 'cycle_time', value: 10 }, // Complete 5 with avg < 10s
    },

    // No features unlocked yet
    unlockedFeatures: [],
    requiresStars: 0,
};

export default level01;
