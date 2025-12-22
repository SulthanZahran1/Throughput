import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GRID_SIZE, IO_PORT } from '../../constants/config';
import { RobotPaths } from './RobotPaths';
import clsx from 'clsx';

interface GridProps {
    children?: React.ReactNode;
}

interface GridEntityProps {
    x: number;
    y: number;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Wrapper for positioning entities within the CSS Grid
 */
export const GridEntity: React.FC<GridEntityProps> = ({ x, y, children, className = '', style = {} }) => {
    return (
        <div
            className={`flex items-center justify-center pointer-events-none ${className}`}
            style={{
                gridColumn: x + 1, // CSS grid is 1-indexed
                gridRow: y + 1,
                width: 'var(--cell-size)',
                height: 'var(--cell-size)',
                ...style,
            }}
        >
            {children}
        </div>
    );
};

export const Grid: React.FC<GridProps> = ({ children }) => {
    const grid = useGameStore(state => state.grid);
    const setPlayerTarget = useGameStore(state => state.setPlayerTarget);

    const handleCellClick = (x: number, y: number) => {
        setPlayerTarget(x, y);
    };

    return (
        <div
            className="grid bg-gray-800 rounded-lg relative"
            style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, var(--cell-size))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, var(--cell-size))`,
                gap: 'var(--grid-gap)',
                padding: 'var(--grid-padding)',
                width: 'fit-content'
            }}
        >
            {/* Grid cells */}
            {grid.map((row, y) => (
                row.map((_slot, x) => {
                    const isIOPort = x === IO_PORT.x && y === IO_PORT.y;
                    return (
                        <div
                            key={`cell-${x}-${y}`}
                            onClick={() => handleCellClick(x, y)}
                            className={clsx(
                                "border rounded cursor-pointer transition-colors hover:bg-gray-700",
                                isIOPort
                                    ? "bg-yellow-500/30 border-yellow-500 animate-pulse"
                                    : "bg-gray-900 border-gray-700"
                            )}
                            style={{
                                gridColumn: x + 1,
                                gridRow: y + 1,
                                width: 'var(--cell-size)',
                                height: 'var(--cell-size)',
                            }}
                        >
                            {isIOPort && (
                                <span className="text-[10px] sm:text-xs text-yellow-400 flex items-center justify-center h-full font-bold">
                                    I/O
                                </span>
                            )}
                        </div>
                    );
                })
            ))}

            {/* Visualizer paths (under robots, over grid) */}
            <RobotPaths />

            {/* Entities rendered as grid children */}
            {children}
        </div>
    );
};
