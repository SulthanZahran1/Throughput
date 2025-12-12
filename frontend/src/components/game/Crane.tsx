import { motion } from 'framer-motion';
import type { Crane as CraneType } from '../../types/game';
import { COLORS } from '../../constants/colors';

interface CraneProps {
    crane: CraneType;
    cellSize: number;
}

export function Crane({ crane, cellSize }: CraneProps) {
    const { x, y, state, carrying } = crane;

    // Calculate animation duration based on distance traveled
    // This creates smooth movement that feels proportional to distance
    const transitionDuration = 0.3;

    return (
        <motion.div
            className="absolute pointer-events-none z-10"
            style={{
                width: cellSize - 4,
                height: cellSize - 4,
            }}
            animate={{
                left: x * cellSize + 2,
                top: y * cellSize + 2,
            }}
            transition={{
                type: 'tween',
                duration: transitionDuration,
                ease: 'easeInOut',
            }}
        >
            {/* Crane body */}
            <div
                className="w-full h-full rounded-md flex items-center justify-center relative"
                style={{
                    backgroundColor: COLORS.crane,
                    boxShadow: `0 0 20px ${COLORS.crane}40`,
                }}
            >
                {/* Crane icon/symbol */}
                <svg
                    viewBox="0 0 24 24"
                    className="w-2/3 h-2/3"
                    fill="none"
                    stroke={COLORS.bgPrimary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* Simple crane/gripper icon */}
                    <path d="M12 2v8" />
                    <path d="M8 6l4 4 4-4" />
                    <rect x="8" y="10" width="8" height="6" rx="1" />
                    <path d="M10 16v4" />
                    <path d="M14 16v4" />
                </svg>

                {/* State indicator */}
                {state !== 'IDLE' && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{
                            backgroundColor:
                                state === 'MOVING'
                                    ? COLORS.warning
                                    : state === 'TRANSFERRING'
                                        ? COLORS.success
                                        : COLORS.itemBlue,
                        }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                )}

                {/* Carrying indicator */}
                {carrying && (
                    <motion.div
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2"
                        style={{
                            backgroundColor: COLORS[`item${carrying.type.charAt(0).toUpperCase() + carrying.type.slice(1)}` as keyof typeof COLORS] || COLORS.itemRed,
                            borderColor: COLORS.bgPrimary,
                        }}
                        initial={{ scale: 0, y: -10 }}
                        animate={{ scale: 1, y: 0 }}
                    />
                )}
            </div>
        </motion.div>
    );
}
