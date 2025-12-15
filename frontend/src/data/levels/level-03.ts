// Level 3: Color Coded
// Tutorial: 8×8, 2 item types, organization matters

import type { LevelDefinition } from '../../types/level';

const level03: LevelDefinition = {
    id: '3',
    name: 'Color Coded',
    description: 'Two item types now. Keep them organized!',
    act: 1,

    gridWidth: 8,
    gridHeight: 8,
    ioPortPosition: { x: 0, y: 7 },

    itemTypes: ['red', 'blue'],

    initialInventory: [],

    shiftDuration: 270, // 4.5 minutes

    orderSchedule: [
        {
            startTime: 0,
            endTime: 270,
            ordersPerMinute: 5,
            itemDistribution: [
                { type: 'red', weight: 0.5 },
                { type: 'blue', weight: 0.5 },
            ],
            timerRange: { min: 35, max: 50 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'orders_completed', value: 12 },
        three: { metric: 'cycle_time', value: 7 },
    },

    // Still no zones - player discovers need organically
    unlockedFeatures: [],
    unlocksFeature: 'zones', // Unlocks zones for Level 4
    requiresStars: 0,
};

export default level03;
