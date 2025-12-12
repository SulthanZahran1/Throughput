import { motion } from 'framer-motion';
import type { Slot as SlotType } from '../../types/game';
import { COLORS, ITEM_COLORS } from '../../constants/colors';

interface SlotProps {
    slot: SlotType;
    cellSize: number;
    isIOPort?: boolean;
    onClick?: () => void;
}

export function Slot({ slot, cellSize, isIOPort = false, onClick }: SlotProps) {
    const { x, y, state, item } = slot;

    // Determine background color
    let bgColor: string = COLORS.bgSlot;
    if (isIOPort) {
        bgColor = COLORS.ioPort;
    } else if (state === 'blocked') {
        bgColor = COLORS.gridLines;
    }

    return (
        <motion.div
            className="absolute rounded-sm flex items-center justify-center cursor-pointer transition-colors hover:opacity-90"
            style={{
                left: x * cellSize,
                top: y * cellSize,
                width: cellSize - 2,
                height: cellSize - 2,
                backgroundColor: bgColor,
                border: `1px solid ${COLORS.gridLines}`,
            }}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Item indicator */}
            {item && (
                <motion.div
                    className="rounded-full"
                    style={{
                        width: cellSize * 0.6,
                        height: cellSize * 0.6,
                        backgroundColor: ITEM_COLORS[item.type] || COLORS.itemRed,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}

            {/* I/O Port indicator */}
            {isIOPort && (
                <span
                    className="font-bold text-xs"
                    style={{ color: COLORS.bgPrimary }}
                >
                    I/O
                </span>
            )}
        </motion.div>
    );
}
