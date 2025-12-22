import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/**
 * Renders paths and targets for all robots
 */
export const RobotPaths: React.FC = () => {
    const robots = useGameStore(state => state.robots);

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-10"
            style={{
                width: '100%',
                height: '100%',
                overflow: 'visible'
            }}
        >
            <AnimatePresence>
                {robots.map(robot => {
                    if (!robot.path || robot.path.length < 2) return null;

                    const color = robot.state === 'moving_to_item' ? '#f59e0b' : '#3b82f6'; // amber-500 vs blue-500

                    // Convert grid coords to pixel coords
                    const getPixelCoords = (gridX: number, gridY: number) => {
                        return {
                            x: `calc(var(--grid-padding) + ${gridX} * (var(--cell-size) + var(--grid-gap)) + var(--cell-size) / 2)`,
                            y: `calc(var(--grid-padding) + ${gridY} * (var(--cell-size) + var(--grid-gap)) + var(--cell-size) / 2)`
                        };
                    };

                    const points = robot.path.map(p => getPixelCoords(p.x, p.y));
                    const start = getPixelCoords(robot.x, robot.y);
                    const end = points[points.length - 1];

                    // Build path string for polyline OR individual lines
                    // Using individual lines with framer-motion is easier for exit animations
                    return (
                        <g key={`path-group-${robot.id}`}>
                            {/* Dotted path line */}
                            {points.map((p, i) => {
                                const prev = i === 0 ? start : points[i - 1];
                                return (
                                    <motion.line
                                        key={`segment-${robot.id}-${i}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.2 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            x1: prev.x,
                                            y1: prev.y,
                                            x2: p.x,
                                            y2: p.y,
                                            stroke: color,
                                            strokeWidth: "2",
                                            strokeDasharray: "4 4",
                                        } as any}
                                        transition={{ duration: 0.2 }}
                                    />
                                );
                            })}

                            {/* Target destination marker */}
                            <g>
                                <motion.circle
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.4 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    style={{
                                        cx: end.x,
                                        cy: end.y,
                                        r: "4",
                                        fill: color,
                                    } as any}
                                />
                                <motion.circle
                                    animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                    style={{
                                        cx: end.x,
                                        cy: end.y,
                                        r: "6",
                                        stroke: color,
                                        strokeWidth: "1",
                                        fill: "transparent",
                                    } as any}
                                />
                            </g>
                        </g>
                    );
                })}
            </AnimatePresence>
        </svg>
    );
};
