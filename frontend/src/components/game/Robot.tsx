import React from 'react';
import type { Robot as RobotType } from '../../types/game';
import { GridEntity } from './Grid';
import { motion, AnimatePresence } from 'framer-motion';
import { ROBOT_BLOCKED_THRESHOLD } from '../../constants/config';

interface RobotProps {
    robot: RobotType;
}

export const Robot: React.FC<RobotProps> = ({ robot }) => {
    const getItemColor = (type: string) => {
        return type === 'red' ? 'bg-red-500' :
            type === 'blue' ? 'bg-blue-500' : 'bg-green-500';
    };

    const isCarrying = robot.carryingItems.length > 0;
    const isBlocked = robot.blockedTicks > ROBOT_BLOCKED_THRESHOLD / 2;
    const isStunned = robot.stunTicks > 0;

    return (
        <GridEntity x={robot.x} y={robot.y} className="z-20">
            {/* Status Icons */}
            <AnimatePresence>
                {(isCarrying || isBlocked || isStunned || robot.state === 'moving_to_item') && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute -top-6 bg-gray-900/80 border border-gray-700 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-xl z-30"
                    >
                        {isStunned && <span className="text-amber-400 text-[10px] animate-pulse font-bold">⚡</span>}
                        {isBlocked && !isStunned && <span className="text-red-400 text-[10px] animate-pulse font-bold">!</span>}
                        {isCarrying && <span className="text-yellow-400 text-[10px] drop-shadow-sm">📦</span>}
                        {robot.state === 'moving_to_item' && <span className="text-blue-400 text-[10px] animate-bounce font-bold">...</span>}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                animate={{
                    opacity: isStunned ? 0.4 : 1,
                    filter: isStunned ? 'grayscale(100%)' : 'grayscale(0%)'
                }}
                className="border-2 border-yellow-500 rounded-md flex items-center justify-center bg-yellow-500/20 relative"
                style={{
                    width: 'calc(var(--cell-size) * 0.85)',
                    height: 'calc(var(--cell-size) * 0.85)',
                }}
            >
                <div
                    className="bg-yellow-500 rounded-full"
                    style={{
                        width: 'calc(var(--cell-size) * 0.17)',
                        height: 'calc(var(--cell-size) * 0.17)',
                    }}
                />
                {/* Show carried items */}
                {robot.carryingItems.length === 1 && (
                    <div
                        className={`absolute rounded-sm ${getItemColor(robot.carryingItems[0].type)}`}
                        style={{
                            top: 'calc(var(--cell-size) * -0.17)',
                            width: 'calc(var(--cell-size) * 0.34)',
                            height: 'calc(var(--cell-size) * 0.34)',
                        }}
                    />
                )}
                {robot.carryingItems.length === 2 && (
                    <>
                        <div
                            className={`absolute rounded-sm ${getItemColor(robot.carryingItems[0].type)}`}
                            style={{
                                top: 'calc(var(--cell-size) * -0.17)',
                                left: 0,
                                width: 'calc(var(--cell-size) * 0.25)',
                                height: 'calc(var(--cell-size) * 0.25)',
                            }}
                        />
                        <div
                            className={`absolute rounded-sm ${getItemColor(robot.carryingItems[1].type)}`}
                            style={{
                                top: 'calc(var(--cell-size) * -0.17)',
                                right: 0,
                                width: 'calc(var(--cell-size) * 0.25)',
                                height: 'calc(var(--cell-size) * 0.25)',
                            }}
                        />
                    </>
                )}
            </motion.div>
        </GridEntity>
    );
};
