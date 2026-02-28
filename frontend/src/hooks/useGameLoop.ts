import { useEffect, useRef, useCallback } from 'react';
import { tickSimulation, checkShiftEnd } from '../engine/simulation';
import type { SimulationContext } from '../engine/types';

interface UseGameLoopOptions {
  isActive: boolean;
  isPaused: boolean;
  targetFPS?: number;
  onTick?: (context: SimulationContext, events: ReturnType<typeof tickSimulation>['events']) => void;
  onShiftEnd?: (reason: 'time' | 'hp') => void;
  onHpLoss?: (amount: number) => void;
}

/**
 * Hook to manage the game simulation loop
 * Uses requestAnimationFrame for smooth updates
 */
export function useGameLoop({
  isActive,
  isPaused,
  targetFPS = 60,
  onTick,
  onShiftEnd,
  onHpLoss,
}: UseGameLoopOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const contextRef = useRef<SimulationContext | null>(null);
  
  // Keep refs in sync with props
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  const setContext = useCallback((context: SimulationContext | null) => {
    contextRef.current = context;
  }, []);
  
  const getContext = useCallback(() => contextRef.current, []);
  
  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    
    const targetDelta = 1000 / targetFPS; // ms per frame (e.g., 16.67ms for 60 FPS)
    const maxIterations = 10; // Max simulation steps per frame (prevents freeze on return from tab)
    const maxAccumulator = targetDelta * maxIterations; // Cap accumulator to prevent huge catch-up
    
    const gameLoop = (currentTime: number) => {
      if (!isActiveRef.current) return;
      
      // Initialize lastTime on first frame
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      // Calculate raw delta time
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      // Accumulate time when not paused
      if (!isPausedRef.current && contextRef.current) {
        accumulatorRef.current += deltaTime;
        
        // Prevent accumulator from growing too large (e.g., after tab switch)
        // Instead of dropping time, we cap it and accept a brief "slow motion" catch-up
        if (accumulatorRef.current > maxAccumulator) {
          // We've fallen too far behind - either:
          // 1. Reset and skip (lose time) - bad
          // 2. Cap and process max iterations (slow motion catch-up) - better
          // We're using option 2: cap the accumulator
          accumulatorRef.current = maxAccumulator;
        }
        
        // Process fixed time steps (catch up if needed)
        let iterations = 0;
        while (accumulatorRef.current >= targetDelta && iterations < maxIterations) {
          const result = tickSimulation(contextRef.current, targetDelta / 1000);
          contextRef.current = result.context;
          
          // Handle HP loss events
          const hpLossEvents = result.events.filter(e => e.type === 'HP_LOST');
          for (const event of hpLossEvents) {
            onHpLoss?.(event.data.amount as number);
          }
          
          // Notify tick callback
          onTick?.(result.context, result.events);
          
          // Check for shift end
          const shiftEnd = checkShiftEnd(result.context);
          if (shiftEnd.ended) {
            // Update store with final context BEFORE stopping the loop
            onTick?.(result.context, result.events);
            onShiftEnd?.(shiftEnd.reason!);
            // Don't set isActiveRef to false here - let the component handle it
            // by setting context to null. This ensures proper cleanup.
            return;
          }
          
          accumulatorRef.current -= targetDelta;
          iterations++;
        }
        
        // If we still have leftover accumulator after max iterations, 
        // carry it over to next frame (creates slight slow-motion effect)
        // This is better than dropping the time entirely
      }
      
      rafRef.current = requestAnimationFrame(gameLoop);
    };
    
    // Start the loop
    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    rafRef.current = requestAnimationFrame(gameLoop);
    
    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isActive, targetFPS, onTick, onShiftEnd, onHpLoss]);
  
  return {
    setContext,
    getContext,
  };
}
