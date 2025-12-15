// Color palette from plan.md Section 7.4
export const COLORS = {
    // Backgrounds
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgSlot: '#1e293b',
    gridLines: '#334155',

    // Entities
    crane: '#22d3ee',
    ioPort: '#facc15',

    // Items
    itemRed: '#ef4444',
    itemBlue: '#3b82f6',
    itemGreen: '#22c55e',
    itemYellow: '#facc15',
    itemPurple: '#a855f7',

    // Zone overlays (with transparency)
    zoneRed: '#ef444466',
    zoneBlue: '#3b82f666',
    zoneGreen: '#22c55e66',
    zoneYellow: '#facc1566',
    zonePurple: '#a855f766',

    // Semantic
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
} as const;

// Item type to color mapping
export const ITEM_COLORS: Record<string, string> = {
    red: COLORS.itemRed,
    blue: COLORS.itemBlue,
    green: COLORS.itemGreen,
    yellow: COLORS.itemYellow,
    purple: COLORS.itemPurple,
};
