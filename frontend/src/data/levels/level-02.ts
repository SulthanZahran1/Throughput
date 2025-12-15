// Level 2: Incoming Shipment
// Tutorial: 8×8, 1 item type, store + retrieve mechanics

import type { LevelDefinition } from '../../types/level';

const level02: LevelDefinition = {
    id: '2',
    name: 'Incoming Shipment',
    description: 'Items arrive at the port. Store them before orders come in.',
    act: 1,

    gridWidth: 8,
    gridHeight: 8,
    ioPortPosition: { x: 0, y: 7 },

    itemTypes: ['red'],

    // Empty grid - player must store items
    initialInventory: [],

    shiftDuration: 240, // 4 minutes

    orderSchedule: [
        // Phase 1: Items arrive, store them
        {
            startTime: 0,
            endTime: 60,
            ordersPerMinute: 0, // No orders yet, just incoming items
            itemDistribution: [{ type: 'red', weight: 1 }],
            timerRange: { min: 45, max: 60 },
        },
        // Phase 2: Mixed store/retrieve
        {
            startTime: 60,
            endTime: 240,
            ordersPerMinute: 4,
            itemDistribution: [{ type: 'red', weight: 1 }],
            timerRange: { min: 40, max: 55 },
        },
    ],

    survivalThreshold: 5,

    starThresholds: {
        one: { metric: 'survival', value: 1 },
        two: { metric: 'orders_completed', value: 8 },
        three: { metric: 'cycle_time', value: 8 },
    },

    unlockedFeatures: [],
    requiresStars: 0,
};

export default level02;
