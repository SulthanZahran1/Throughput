// Level 8: Priority Shift
// Act 2: Demand changes throughout shift, priority tuning required

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level08: LevelDefinition = {
    id: '8',
    name: 'Priority Shift',
    description: 'Customer preferences change. Adapt your zones.',
    act: 2,

    gridWidth: 12,
    gridHeight: 12,
    ioPortPosition: { x: 0, y: 11 },

    itemTypes: ['red', 'blue', 'green'],

    initialInventory: [],

    shiftDuration: 300,

    orderSchedule: [
        // Red-heavy phase
        {
            startTime: 0,
            endTime: 100,
            ordersPerMinute: 12,
            itemDistribution: [
                { type: 'red', weight: 0.7 },
                { type: 'blue', weight: 0.2 },
                { type: 'green', weight: 0.1 },
            ],
            timerRange: { min: 25, max: 40 },
        },
        // Blue-heavy phase
        {
            startTime: 100,
            endTime: 200,
            ordersPerMinute: 12,
            itemDistribution: [
                { type: 'red', weight: 0.2 },
                { type: 'blue', weight: 0.6 },
                { type: 'green', weight: 0.2 },
            ],
            timerRange: { min: 25, max: 40 },
        },
        // Green-heavy phase
        {
            startTime: 200,
            endTime: 300,
            ordersPerMinute: 12,
            itemDistribution: [
                { type: 'red', weight: 0.15 },
                { type: 'blue', weight: 0.15 },
                { type: 'green', weight: 0.7 },
            ],
            timerRange: { min: 25, max: 40 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 380 },
        three: { metric: 'jph', value: 450 },
    },

    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND, FEATURE_FLAGS.RETRIEVAL_MODES],
    requiresStars: 6,
};

export default level08;
