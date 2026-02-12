import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { getIOPort } from '../../constants/config';
import { RobotPaths } from './RobotPaths';
import clsx from 'clsx';
import * as Icons from 'lucide-react';

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
            className={`absolute flex items-center justify-center pointer-events-none ${className}`}
            style={{
                width: 'var(--cell-size)',
                height: 'var(--cell-size)',
                left: 'var(--grid-padding)',
                top: 'var(--grid-padding)',
                transform: `translate(calc(${x} * (var(--cell-size) + var(--grid-gap))), calc(${y} * (var(--cell-size) + var(--grid-gap))))`,
                transition: 'transform 0.1s linear', // Smooth transition for drift
                ...style,
            }}
        >
            {children}
        </div>
    );
};

const ConveyorProjections: React.FC = () => {
    const upgrades = useGameStore(state => state.upgrades);
    const gridSize = useGameStore(state => state.gridSize);
    const isConveyorActive = upgrades.includes('conveyor_belt');

    if (!isConveyorActive) return null;

    const ioPort = getIOPort(gridSize);

    return (
        <div className="absolute inset-0 pointer-events-none opacity-20">
            {Array.from({ length: gridSize }).map((_, y) => (
                Array.from({ length: gridSize }).map((_, x) => {
                    if (x === ioPort.x && y === ioPort.y) return null;

                    const dx = ioPort.x - x;
                    const dy = ioPort.y - y;

                    let rotation = 0;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        rotation = dx > 0 ? 0 : 180;
                    } else {
                        rotation = dy > 0 ? -90 : 90;
                    }

                    return (
                        <GridEntity key={`conveyor-${x}-${y}`} x={x} y={y}>
                            <Icons.ChevronRight
                                size="60%"
                                className="text-blue-400"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            />
                        </GridEntity>
                    );
                })
            ))}
        </div>
    );
};

export const Grid: React.FC<GridProps> = ({ children }) => {
    const grid = useGameStore(state => state.grid);
    const gridSize = useGameStore(state => state.gridSize);
    const setPlayerTarget = useGameStore(state => state.setPlayerTarget);

    const handleCellClick = (x: number, y: number) => {
        setPlayerTarget(x, y);
    };

    const ioPort = getIOPort(gridSize);

    return (
        <div
            className="grid bg-gray-800 rounded-lg relative"
            style={{
                gridTemplateColumns: `repeat(${gridSize}, var(--cell-size))`,
                gridTemplateRows: `repeat(${gridSize}, var(--cell-size))`,
                gap: 'var(--grid-gap)',
                padding: 'var(--grid-padding)',
                width: 'fit-content'
            }}
        >
            {/* Grid cells */}
            {grid.map((row, y) => (
                row.map((_slot, x) => {
                    const isIOPort = x === ioPort.x && y === ioPort.y;
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
            <ConveyorProjections />

            {/* Entities rendered as grid children */}
            {children}
        </div>
    );
};

