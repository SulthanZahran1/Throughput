import React from 'react';
import type { Robot as RobotType } from '../../types/game';
import { GridEntity } from './Grid';

interface RobotProps {
    robot: RobotType;
}

export const Robot: React.FC<RobotProps> = ({ robot }) => {
    const getItemColor = (type: string) => {
        return type === 'red' ? 'bg-red-500' :
            type === 'blue' ? 'bg-blue-500' : 'bg-green-500';
    };

    return (
        <GridEntity x={robot.x} y={robot.y} className="z-20">
            <div
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
            </div>
        </GridEntity>
    );
};
