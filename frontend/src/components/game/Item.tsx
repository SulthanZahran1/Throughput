import React from 'react';
import type { Item as ItemType } from '../../types/game';
import { GridEntity } from './Grid';
import { motion } from 'framer-motion';
import { PRODUCT_DEFINITIONS } from '../../constants/config';
import * as Icons from 'lucide-react';

interface ItemProps {
    item: ItemType;
}

export const Item: React.FC<ItemProps> = ({ item }) => {
    const product = PRODUCT_DEFINITIONS[item.type];
    const Icon = (Icons as any)[product.icon] || Icons.Package;

    return (
        <GridEntity x={item.x} y={item.y} className="z-0">
            <motion.div
                className={`rounded-md shadow-lg flex items-center justify-center bg-gradient-to-br ${product.gradient} border border-white/20`}
                style={{
                    width: 'calc(var(--cell-size) * 0.75)',
                    height: 'calc(var(--cell-size) * 0.75)',
                }}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Icon size="60%" color="white" strokeWidth={2.5} />

                {product.trait === 'hazardous' && (
                    <motion.div
                        className="absolute inset-0 rounded-md bg-green-400/20 blur-sm"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </motion.div>
        </GridEntity>
    );
};
