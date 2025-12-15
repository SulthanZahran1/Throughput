// Level 10: Rush Hour
// Act 2 finale: Everything combined, high pressure

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level10: LevelDefinition = {
    id: '10',
    name: 'Rush Hour',
    description: 'The ultimate test. Can you survive the rush?',
    act: 2,

    gridWidth: 12,
    gridHeight: 12,
    ioPortPosition: { x: 0, y: 11 },

    itemTypes: ['red', 'blue', 'green'],

    initialInventory: [],

    shiftDuration: 360, // 6 minutes

    orderSchedule: [
        // Warm up
        {
            startTime: 0,
            endTime: 60,
            ordersPerMinute: 10,
            itemDistribution: [
                { type: 'red', weight: 0.33 },
                { type: 'blue', weight: 0.33 },
                { type: 'green', weight: 0.34 },
            ],
            timerRange: { min: 25, max: 40 },
        },
        // Building pressure
        {
            startTime: 60,
            endTime: 180,
            ordersPerMinute: 16,
            itemDistribution: [
                { type: 'red', weight: 0.4 },
                { type: 'blue', weight: 0.35 },
                { type: 'green', weight: 0.25 },
            ],
            timerRange: { min: 20, max: 35 },
        },
        // Rush hour
        {
            startTime: 180,
            endTime: 300,
            ordersPerMinute: 22,
            itemDistribution: [
                { type: 'red', weight: 0.5 },
                { type: 'blue', weight: 0.3 },
                { type: 'green', weight: 0.2 },
            ],
            timerRange: { min: 15, max: 30 },
        },
        // Cool down
        {
            startTime: 300,
            endTime: 360,
            ordersPerMinute: 8,
            itemDistribution: [
                { type: 'red', weight: 0.33 },
                { type: 'blue', weight: 0.33 },
                { type: 'green', weight: 0.34 },
            ],
            timerRange: { min: 30, max: 45 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 450 },
        three: { metric: 'jph', value: 520 },
    },

    unlockedFeatures: [FEATURE_FLAGS.ZONES, FEATURE_FLAGS.DUAL_COMMAND, FEATURE_FLAGS.RETRIEVAL_MODES],
    requiresStars: 10,
};

export default level10;
