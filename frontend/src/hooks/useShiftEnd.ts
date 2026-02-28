import { useEffect } from 'react';
import { useRunStore, useGameStore, useUiStore } from '../store';
import { generateShiftResult } from '../engine/simulation';
import { getRandomModifier } from '../data/modifiers';
import type { ShiftResult } from '../engine/types';

interface UseShiftEndOptions {
  onShiftComplete?: (result: ShiftResult) => void;
  onRunEnd?: () => void;
}

/**
 * Hook to handle shift end logic
 * - Calculates shift results
 * - Applies HP loss
 * - Checks for run end
 * - Generates next modifier
 */
export function useShiftEnd({ onShiftComplete, onRunEnd }: UseShiftEndOptions = {}) {
  const { 
    isActive, 
    hp, 
    currentShift, 
    rng, 
    applyShiftResult, 
    damageHp, 
    advanceToNextShift,
    setNextModifier,
    usedModifiers,
    endRun,
  } = useRunStore();
  
  const { context, reset: resetGame } = useGameStore();
  const { navigateTo } = useUiStore();
  
  useEffect(() => {
    if (!isActive || !context) return;
    
    // Check for HP = 0 (run failure)
    if (hp <= 0) {
      // End the run
      endRun(false);
      resetGame();
      navigateTo('run_over');
      onRunEnd?.();
      return;
    }
    
    // Check if shift time has expired
    if (context.shiftTimeRemaining <= 0) {
      // Generate shift result
      const result = generateShiftResult(context);
      
      // Apply to run state
      applyShiftResult(result);
      
      // Calculate HP loss from failed orders
      const hpLoss = result.ordersFailed;
      if (hpLoss > 0) {
        const isDead = damageHp(hpLoss);
        if (isDead) {
          endRun(false);
          resetGame();
          navigateTo('run_over');
          onRunEnd?.();
          return;
        }
      }
      
      // Notify callback
      onShiftComplete?.(result);
      
      // Check for victory (completed 8 shifts)
      if (currentShift >= 8) {
        endRun(true);
        resetGame();
        navigateTo('victory');
        onRunEnd?.();
        return;
      }
      
      // Generate next modifier
      if (rng) {
        const nextMod = getRandomModifier(usedModifiers, rng);
        setNextModifier(nextMod.id);
      }
      
      // Advance to next shift
      advanceToNextShift();
      resetGame();
      
      // Navigate to upgrade pick or pre-shift
      if (result.completed) {
        navigateTo('upgrade_pick');
      } else {
        navigateTo('pre_shift');
      }
    }
  }, [
    isActive,
    hp,
    currentShift,
    context,
    rng,
    usedModifiers,
    applyShiftResult,
    damageHp,
    advanceToNextShift,
    setNextModifier,
    endRun,
    resetGame,
    navigateTo,
    onShiftComplete,
    onRunEnd,
  ]);
  
  return {
    isShiftEnding: context?.shiftTimeRemaining === 0,
  };
}
