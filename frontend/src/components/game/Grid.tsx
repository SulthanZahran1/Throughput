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

    // Generate slot array from grid map
    const slots = useMemo(() => {
        if (!grid) return [];
        return Array.from(grid.slots.values());
    }, [grid]);

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
            className="relative rounded-lg overflow-hidden"
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
                        onClick={() => onSlotClick?.(slot.x, slot.y)}
                    />
                );
            })}

            {/* Render crane */}
            {crane && <Crane crane={crane} cellSize={cellSize} />}
        </div>
    );
}
