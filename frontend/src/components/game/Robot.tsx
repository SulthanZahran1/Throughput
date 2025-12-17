import React, { useEffect, useState } from 'react';
import type { Robot as RobotType } from '../../types/game';

interface RobotProps {
    robot: RobotType;
}

// Hook to get CSS variable values
const useCellSize = () => {
    const [cellSize, setCellSize] = useState(36);
    const [gridPadding, setGridPadding] = useState(8);

    useEffect(() => {
        const updateSizes = () => {
            const root = document.documentElement;
            const cellSizeStr = getComputedStyle(root).getPropertyValue('--cell-size').trim();
            const paddingStr = getComputedStyle(root).getPropertyValue('--grid-padding').trim();

            const cellSizeNum = parseFloat(cellSizeStr) || 36;
            const paddingNum = parseFloat(paddingStr) || 8;

            setCellSize(cellSizeNum);
            setGridPadding(paddingNum);
        };

        updateSizes();
        window.addEventListener('resize', updateSizes);
        return () => window.removeEventListener('resize', updateSizes);
    }, []);

    return { cellSize, gridPadding };
};

export const Robot: React.FC<RobotProps> = ({ robot }) => {
    const { cellSize, gridPadding } = useCellSize();
    const robotSize = cellSize * 0.85;

    const style = {
        transform: `translate(${robot.x * cellSize + gridPadding + (cellSize - robotSize) / 2}px, ${robot.y * cellSize + gridPadding + (cellSize - robotSize) / 2}px)`,
        width: robotSize,
        height: robotSize,
    };

    const getItemColor = (type: string) => {
        return type === 'red' ? 'bg-red-500' :
            type === 'blue' ? 'bg-blue-500' : 'bg-green-500';
    };

    const carriedItemSize = robotSize * 0.4;

    return (
        <div
            className="absolute border-2 border-yellow-500 rounded-md z-20 flex items-center justify-center bg-yellow-500/20"
            style={style}
        >
            <div className="bg-yellow-500 rounded-full" style={{ width: robotSize * 0.2, height: robotSize * 0.2 }} />
            {/* Show carried items */}
            {robot.carryingItems.length === 1 && (
                <div
                    className={`absolute rounded-sm ${getItemColor(robot.carryingItems[0].type)}`}
                    style={{ top: -carriedItemSize / 2, width: carriedItemSize, height: carriedItemSize }}
                />
            )}
            {robot.carryingItems.length === 2 && (
                <>
                    <div
                        className={`absolute rounded-sm ${getItemColor(robot.carryingItems[0].type)}`}
                        style={{ top: -carriedItemSize / 2, left: 0, width: carriedItemSize * 0.75, height: carriedItemSize * 0.75 }}
                    />
                    <div
                        className={`absolute rounded-sm ${getItemColor(robot.carryingItems[1].type)}`}
                        style={{ top: -carriedItemSize / 2, right: 0, width: carriedItemSize * 0.75, height: carriedItemSize * 0.75 }}
                    />
                </>
            )}
        </div>
    );
};

