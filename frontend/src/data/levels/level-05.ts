// Level 5: The System
// Tutorial finale: 10×10, dual command unlocked, priority matters

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level05: LevelDefinition = {
    id: '5',
    name: 'The System',
    description: 'Orders are piling up. You need automation.',
    act: 1,

    gridWidth: 10,
    gridHeight: 10,
    ioPortPosition: { x: 0, y: 9 },

    itemTypes: ['red', 'blue'],

    initialInventory: [],

    shiftDuration: 300, // 5 minutes

    orderSchedule: [
        // Steady early phase
        {
            startTime: 0,
            endTime: 180,
            ordersPerMinute: 8,
            itemDistribution: [
                { type: 'red', weight: 0.7 },
                { type: 'blue', weight: 0.3 },
            ],
            timerRange: { min: 30, max: 60 },
        },
        // Rush phase
        {
            startTime: 180,
            endTime: 300,
            ordersPerMinute: 15,
            itemDistribution: [
                { type: 'red', weight: 0.5 },
                { type: 'blue', weight: 0.5 },
            ],
            timerRange: { min: 20, max: 45 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 280 },
        three: { metric: 'jph', value: 350 },
    },

    // Zones + Dual Command available
    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND],
    unlocksFeature: FEATURE_FLAGS.RETRIEVAL_MODES,
    requiresStars: 0,
};

export default level05;
