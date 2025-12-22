import React from 'react';
import type { Item as ItemType } from '../../types/game';
import { GridEntity } from './Grid';
import { motion } from 'framer-motion';

interface ItemProps {
    item: ItemType;
}

export const Item: React.FC<ItemProps> = ({ item }) => {
    return (
        <GridEntity x={item.x} y={item.y} className="z-0">
            <motion.div
                className={`rounded-sm shadow-sm ${item.type === 'red' ? 'bg-red-500' :
                    item.type === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                style={{
                    width: 'calc(var(--cell-size) * 0.65)',
                    height: 'calc(var(--cell-size) * 0.65)',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        </GridEntity>
    );
};
