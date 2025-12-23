import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { GridEntity } from './Grid';

export const FloatingXpLayer: React.FC = () => {
    const floatingXp = useGameStore(state => state.floatingXp);
    const runTime = useGameStore(state => state.runTime);

    // Filter out old XP notifications (visible for 1.5s)
    const activeNotifications = floatingXp.filter(xp => runTime - xp.createdAt < 1500);

    return (
        <div className="absolute inset-0 pointer-events-none z-50">
            <AnimatePresence>
                {activeNotifications.map(xp => (
                    <GridEntity key={xp.id} x={xp.x} y={xp.y}>
                        <motion.div
                            initial={{ y: 0, opacity: 0, scale: 0.5 }}
                            animate={{ y: -40, opacity: 1, scale: 1.2 }}
                            exit={{ y: -60, opacity: 0, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="text-yellow-400 font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] whitespace-nowrap"
                        >
                            +{xp.amount} XP
                        </motion.div>
                    </GridEntity>
                ))}
            </AnimatePresence>
        </div>
    );
};
