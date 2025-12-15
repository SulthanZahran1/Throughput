// Level 9: Tight Timers
// Act 2: Short deadlines require efficient layouts

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level09: LevelDefinition = {
    id: '9',
    name: 'Tight Timers',
    description: 'Deadlines are shorter. Efficiency is everything.',
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
            endTime: 300,
            ordersPerMinute: 14,
            itemDistribution: [
                { type: 'red', weight: 0.4 },
                { type: 'blue', weight: 0.35 },
                { type: 'green', weight: 0.25 },
            ],
            timerRange: { min: 15, max: 25 }, // Tight!
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 400 },
        three: { metric: 'cycle_time', value: 4 },
    },

    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND, FEATURE_FLAGS.RETRIEVAL_MODES],
    requiresStars: 8,
};

export default level09;
