import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { tickSimulation, type SimulationContext } from '../engine';
import type { ItemType } from '../types/game';

/**
 * Game Loop Hook
 * 
 * Manages the animation frame loop and delegates simulation to the engine.
 * The engine is pure - it takes state and returns new state.
 * This hook bridges the engine with the Zustand store.
 */
export function useGameLoop() {
    const isPaused = useGameStore((state) => state.isPaused);
    const lastTimeRef = useRef<number>(0);
    const requestRef = useRef<number>(0);

    // Get all state needed for simulation
    const getSimulationContext = useCallback((): SimulationContext | null => {
        const state = useGameStore.getState();
        if (!state.grid || !state.crane || !state.currentLevel) return null;

        return {
            shiftTime: state.shiftTime,
            realTime: state.realTime,
            grid: state.grid,
            crane: state.crane,
            orders: state.orders,
            zones: state.zones,
            retrievalMode: state.retrievalMode,
            craneMode: state.craneMode,
            stats: state.stats,
            shiftDuration: state.shiftDuration,
            lastOrderTime: state.lastOrderTime,
            availableItemTypes: state.currentLevel.itemTypes as ItemType[],
            orderSchedule: state.currentLevel.orderSchedule.map(wave => ({
                startTime: wave.startTime,
                endTime: wave.endTime,
                ordersPerMinute: wave.ordersPerMinute,
                itemDistribution: wave.itemDistribution as { type: ItemType; weight: number }[],
                timerRange: wave.timerRange,
            })),
        };
    }, []);

    useEffect(() => {
        const animate = (time: number) => {
            if (lastTimeRef.current !== 0) {
                const dt = (time - lastTimeRef.current) / 1000;
                // Cap dt to avoid huge jumps if tab inactive (max 100ms)
                const cappedDt = Math.min(dt, 0.1);

                // Get current state
                const context = getSimulationContext();
                if (context) {
                    // Run engine tick
                    const result = tickSimulation(context, cappedDt);

                    // Update store with new state
                    useGameStore.getState().setSimulationState({
                        shiftTime: result.state.shiftTime,
                        realTime: result.state.realTime,
                        grid: result.state.grid,
                        crane: result.state.crane,
                        orders: result.state.orders,
                        stats: result.state.stats,
                        lastOrderTime: context.lastOrderTime !== result.state.realTime 
                            ? result.state.realTime 
                            : context.lastOrderTime,
                    });
                }
            }
            lastTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };

        if (!isPaused) {
            lastTimeRef.current = 0; // Reset on resume so first frame doesn't have huge dt
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = 0;
        }

        return () => cancelAnimationFrame(requestRef.current);
    }, [isPaused, getSimulationContext]);
}
