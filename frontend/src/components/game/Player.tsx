import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GridEntity } from './Grid';
import { motion } from 'framer-motion';

export const Player: React.FC = () => {
    const player = useGameStore(state => state.player);

    return (
        <GridEntity x={player.x} y={player.y} className="z-10">
            <motion.div
                className="bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white"
                style={{
                    width: 'calc(var(--cell-size) * 0.85)',
                    height: 'calc(var(--cell-size) * 0.85)',
                }}
                initial={false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {player.carrying && (
                    <div
                        className={`rounded-sm ${player.carrying.type === 'red' ? 'bg-red-500' :
                            player.carrying.type === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                        style={{
                            width: 'calc(var(--cell-size) * 0.4)',
                            height: 'calc(var(--cell-size) * 0.4)',
                        }}
                    />
                )}
            </motion.div>
        </GridEntity>
    );
};
