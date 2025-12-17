import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GRID_SIZE, IO_PORT } from '../../constants/config';
import clsx from 'clsx';

export const Grid: React.FC = () => {
    const grid = useGameStore(state => state.grid);
    const setPlayerTarget = useGameStore(state => state.setPlayerTarget);

    const handleCellClick = (x: number, y: number) => {
        setPlayerTarget(x, y);
    };

    return (
        <div
            className="grid bg-gray-800 rounded-lg"
            style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, var(--cell-size))`,
                gap: 'var(--grid-gap)',
                padding: 'var(--grid-padding)',
                width: 'fit-content'
            }}
        >
            {grid.map((row, y) => (
                row.map((_slot, x) => {
                    const isIOPort = x === IO_PORT.x && y === IO_PORT.y;
                    return (
                        <div
                            key={`${x}-${y}`}
                            onClick={() => handleCellClick(x, y)}
                            className={clsx(
                                "border rounded cursor-pointer transition-colors hover:bg-gray-700",
                                isIOPort
                                    ? "bg-yellow-500/30 border-yellow-500 animate-pulse"
                                    : "bg-gray-900 border-gray-700"
                            )}
                            style={{
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
        </div>
    );
};
