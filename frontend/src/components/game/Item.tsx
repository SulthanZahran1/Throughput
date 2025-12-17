import React, { useEffect, useState } from 'react';
import type { Item as ItemType } from '../../types/game';
import { motion } from 'framer-motion';

interface ItemProps {
    item: ItemType;
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

export const Item: React.FC<ItemProps> = ({ item }) => {
    const { cellSize, gridPadding } = useCellSize();
    const itemSize = cellSize * 0.65;

    return (
        <motion.div
            className={`absolute rounded-sm z-0 flex items-center justify-center shadow-sm ${item.type === 'red' ? 'bg-red-500' :
                item.type === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                }`}
            style={{
                width: itemSize,
                height: itemSize,
            }}
            initial={{ scale: 0 }}
            animate={{
                x: item.x * cellSize + gridPadding + (cellSize - itemSize) / 2,
                y: item.y * cellSize + gridPadding + (cellSize - itemSize) / 2,
                scale: 1
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
    );
};
