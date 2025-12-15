// Level 4: Zone Defense
// Tutorial: 10×10, zones unlocked, guided zone creation

import type { LevelDefinition } from '../../types/level';
import { FEATURE_FLAGS } from '../../types/level';

const level04: LevelDefinition = {
    id: '4',
    name: 'Zone Defense',
    description: 'Use zones to automate storage decisions.',
    act: 1,

    gridWidth: 10,
    gridHeight: 10,
    ioPortPosition: { x: 0, y: 9 },

    itemTypes: ['red', 'blue'],

    initialInventory: [],

    shiftDuration: 300, // 5 minutes

    orderSchedule: [
        {
            startTime: 0,
            endTime: 300,
            ordersPerMinute: 6,
            itemDistribution: [
                { type: 'red', weight: 0.6 },
                { type: 'blue', weight: 0.4 },
            ],
            timerRange: { min: 30, max: 45 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'jph', value: 200 },
        three: { metric: 'cycle_time', value: 5 },
    },

    // Zones now available
    unlockedFeatures: [FEATURE_FLAGS.ZONES],
    requiresStars: 0,
};

export default level04;
