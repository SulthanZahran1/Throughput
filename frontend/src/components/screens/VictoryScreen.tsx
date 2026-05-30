import React from 'react';
import { useUiStore, useRunStore, useMetaStore } from '../../store';
import { Button } from '../ui/Button';
import { api } from '../../api';

function calculateCrateReward(result: { totalOrdersCompleted: number; won: boolean; difficulty: string }): number {
  let reward = 0;
  reward += result.totalOrdersCompleted * 2;
  if (result.won) {
    reward += 50;
  }
  const difficultyBonus: Record<string, number> = {
    normal: 1,
    hard: 1.5,
    brutal: 2,
  };
  return Math.floor(reward * (difficultyBonus[result.difficulty] || 1));
}

export function VictoryScreen() {
  const { navigateTo } = useUiStore();
  const metaState = useMetaStore();
  const { recordRun } = metaState;

  React.useEffect(() => {
    const result = useRunStore.getState().endRun(true);
    if (result) {
      recordRun(result);

      // Fire-and-forget POST /api/runs
      const cratesEarned = calculateCrateReward(result);
      api.submitRun({
        deviceId: metaState.deviceId,
        seed: result.seed,
        difficulty: result.difficulty,
        shiftsSurvived: result.shiftsSurvived,
        totalOrdersCompleted: result.totalOrdersCompleted,
        totalOrdersFailed: result.totalOrdersFailed,
        finalHp: result.finalHp,
        maxHp: result.maxHp,
        score: result.score,
        cratesEarned,
        upgradesHeld: result.upgradesHeld,
        won: result.won,
      });
    }
  }, [recordRun, metaState.deviceId]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 overflow-hidden text-center">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent" />

      <div className="relative z-10 space-y-8 max-w-2xl">
        <div className="relative">
          <div className="absolute -inset-10 bg-green-500/20 blur-3xl rounded-full" />
          <h1 className="relative text-9xl font-black text-green-400 italic tracking-tighter text-glow animate-bounce">
            VICTORY
          </h1>
          <div className="text-xl font-mono text-green-500/70 tracking-widest uppercase">
            Contract Fulfilled // Maximum Throughput Achieved
          </div>
        </div>

        <div className="panel-industrial p-8 bg-slate-900/60 backdrop-blur-sm border-green-500/30">
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            All 8 shifts completed with optimal efficiency. Your performance has been logged in the corporate database.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-950/50 p-4 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Bonus Crates</div>
              <div className="text-3xl font-black text-white">+5</div>
            </div>
            <div className="bg-slate-950/50 p-4 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Rank</div>
              <div className="text-3xl font-black text-blue-400">S+</div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => navigateTo('main_menu')}
            className="w-full h-16 bg-green-600 hover:bg-green-500 border-green-800"
          >
            Return to Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
