import { useMemo } from 'react';
import { Slot } from './Slot';
import { Crane } from './Crane';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../constants/colors';
import { toKey } from '../../utils/coordinates';

interface GridProps {
    cellSize?: number;
    onSlotClick?: (x: number, y: number) => void;
}

export function Grid({ cellSize = 40, onSlotClick }: GridProps) {
    const grid = useGameStore((state) => state.grid);
    const crane = useGameStore((state) => state.crane);
    const zones = useGameStore((state) => state.zones);
    const editingZoneId = useGameStore((state) => state.editingZoneId);
    const paintCell = useGameStore((state) => state.paintCell);

    // Generate slot array from grid map
    const slots = useMemo(() => {
        if (!grid) return [];
        return Array.from(grid.slots.values());
    }, [grid]);

    const getZoneColor = (zoneId: string | null) => {
        if (!zoneId) return undefined;
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return undefined;

        // Visual feedback during editing
        if (editingZoneId) {
            if (zoneId === editingZoneId) {
                // Highlight current zone
                return zone.color;
            } else {
                // Dim other zones
                return `${zone.color}40`; // 25% opacity (assuming hex color)
            }
        }

        return zone.color;
    };

    const handleSlotMouseDown = (x: number, y: number) => {
        if (editingZoneId) {
            paintCell(x, y, 'add');
        } else {
            onSlotClick?.(x, y);
        }
    };

    const handleSlotMouseEnter = (x: number, y: number, e: React.MouseEvent) => {
        if (editingZoneId && e.buttons === 1) {
            paintCell(x, y, 'add');
        }
    };

    // Cursor style based on mode
    const cursorStyle = editingZoneId ? 'cursor-crosshair' : 'cursor-pointer';

    if (!grid) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                No grid loaded
            </div>
        );
    }

    const gridWidth = grid.width * cellSize;
    const gridHeight = grid.height * cellSize;

    return (
        <div
            className={`relative rounded-lg overflow-hidden select-none ${cursorStyle}`}
            style={{
                width: gridWidth,
                height: gridHeight,
                backgroundColor: COLORS.bgPrimary,
                boxShadow: `inset 0 0 0 2px ${COLORS.gridLines}`,
            }}
        >
            {/* Render all slots */}
            {slots.map((slot) => {
                const isIOPort =
                    slot.x === grid.ioPort.x && slot.y === grid.ioPort.y;

                return (
                    <Slot
                        key={toKey(slot.x, slot.y)}
                        slot={slot}
                        cellSize={cellSize}
                        isIOPort={isIOPort}
                        zoneColor={getZoneColor(slot.zoneId)}
                        onClick={() => handleSlotMouseDown(slot.x, slot.y)}
                        onMouseEnter={(e: any) => handleSlotMouseEnter(slot.x, slot.y, e)}
                    />
                );
            })}

            {/* Render crane */}
            {crane && <Crane crane={crane} cellSize={cellSize} />}
        </div>
    );
}
