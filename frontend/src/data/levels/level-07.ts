// Level 7: Demand Surge
// Act 2: Demand spike pattern

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level07: LevelDefinition = {
    id: '7',
    name: 'Demand Surge',
    description: 'Orders spike mid-shift. Can your zones handle it?',
    act: 2,

    gridWidth: 12,
    gridHeight: 12,
    ioPortPosition: { x: 0, y: 11 },

    itemTypes: ['red', 'blue', 'green'],

    initialInventory: [],

    shiftDuration: 300,

    orderSchedule: [
        {
            startTime: 0,
            endTime: 120,
            ordersPerMinute: 8,
            itemDistribution: [
                { type: 'red', weight: 0.4 },
                { type: 'blue', weight: 0.35 },
                { type: 'green', weight: 0.25 },
            ],
            timerRange: { min: 30, max: 45 },
        },
        // Surge
        {
            startTime: 120,
            endTime: 200,
            ordersPerMinute: 18,
            itemDistribution: [
                { type: 'red', weight: 0.5 },
                { type: 'blue', weight: 0.3 },
                { type: 'green', weight: 0.2 },
            ],
            timerRange: { min: 20, max: 35 },
        },
        // Wind down
        {
            startTime: 200,
            endTime: 300,
            ordersPerMinute: 10,
            itemDistribution: [
                { type: 'red', weight: 0.33 },
                { type: 'blue', weight: 0.33 },
                { type: 'green', weight: 0.34 },
            ],
            timerRange: { min: 25, max: 40 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 350 },
        three: { metric: 'jph', value: 420 },
    },

    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND, FEATURE_FLAGS.RETRIEVAL_MODES],
    requiresStars: 4,
};

export default level07;
