// Level 6: Picking Up Speed
// Act 2: 12×12, 3 item types, higher order rate

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level06: LevelDefinition = {
    id: '6',
    name: 'Picking Up Speed',
    description: 'The pace picks up. A new item type joins the mix.',
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
            ordersPerMinute: 10,
            itemDistribution: [
                { type: 'red', weight: 0.4 },
                { type: 'blue', weight: 0.35 },
                { type: 'green', weight: 0.25 },
            ],
            timerRange: { min: 25, max: 40 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 320 },
        three: { metric: 'jph', value: 400 },
    },

    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND, FEATURE_FLAGS.RETRIEVAL_MODES],
    requiresStars: 3,
};

export default level06;
