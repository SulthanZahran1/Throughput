import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';

// Hook to get CSS variable values
const useCellSize = () => {
    const [cellSize, setCellSize] = useState(36);
    const [gridPadding, setGridPadding] = useState(8);

    useEffect(() => {
        const updateSizes = () => {
            const root = document.documentElement;
            const cellSizeStr = getComputedStyle(root).getPropertyValue('--cell-size').trim();
            const paddingStr = getComputedStyle(root).getPropertyValue('--grid-padding').trim();

            // Parse px value
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

export const Player: React.FC = () => {
    const player = useGameStore(state => state.player);
    const { cellSize, gridPadding } = useCellSize();

    // Size player proportionally to cell size
    const playerSize = cellSize * 0.85;

    return (
        <motion.div
            className="absolute bg-yellow-400 rounded-full z-10 flex items-center justify-center border-2 border-white"
            style={{
                width: playerSize,
                height: playerSize,
            }}
            animate={{
                x: player.x * cellSize + gridPadding + (cellSize - playerSize) / 2,
                y: player.y * cellSize + gridPadding + (cellSize - playerSize) / 2,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {player.carrying && (
                <div
                    className={`rounded-sm ${player.carrying.type === 'red' ? 'bg-red-500' :
                        player.carrying.type === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                    style={{ width: playerSize * 0.5, height: playerSize * 0.5 }}
                />
            )}
        </motion.div>
    );
};
