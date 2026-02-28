import { useState } from 'react';
import { useUiStore, useMetaStore, useRunStore, useGameStore } from '../../store';
import { Button } from '../ui/Button';
import { generateSeed, formatSeed } from '../../utils/formatters';
import { createRng } from '../../engine/rng';
import { createGrid } from '../../engine/grid';
import { createSimulationContext } from '../../engine/simulation';
import { generateShiftParameters } from '../../data/escalation';
import { applyUpgradesToFlags } from '../../data/upgrades';

export function MainMenuScreen() {
  const { navigateTo } = useUiStore();
  const { crates, bestScores, totalRuns, totalWins } = useMetaStore();
  const startRun = useRunStore(state => state.startRun);
  const initializeShift = useGameStore(state => state.initializeShift);
  const heldUpgrades = useRunStore(state => state.heldUpgrades);
  
  const [difficulty, setDifficulty] = useState<'normal' | 'hard' | 'brutal'>('normal');
  const [seedInput, setSeedInput] = useState('');
  
  const handleStartRun = () => {
    const seed = seedInput ? parseInt(seedInput, 10) || generateSeed() : generateSeed();
    
    // Start the run
    startRun(seed, difficulty);
    
    // Generate shift 1 parameters
    const flags = applyUpgradesToFlags({}, heldUpgrades.map(u => u.id));
    
    const params = generateShiftParameters(
      1,
      seed,
      difficulty,
      heldUpgrades.map(u => u.id),
      null, // No modifier for shift 1
      flags
    );
    
    // Create simulation context
    const rng = createRng(seed);
    const grid = createGrid({
      width: params.gridWidth,
      height: params.gridHeight,
      blockedCells: params.blockedCells,
      initialInventory: params.initialInventory,
    }, rng);
    
    const context = createSimulationContext(
      seed,
      1,
      difficulty,
      grid,
      flags,
      {
        totalShiftTime: params.totalShiftTime,
        orderSpawnRate: params.orderSpawnRate,
        orderDeadlineBase: params.orderDeadlineBase,
        craneCount: params.craneCount,
        craneSpeed: params.craneSpeed,
        transferTime: params.transferTime,
      },
      rng
    );
    
    // Initialize game
    initializeShift(params, context);
    
    // Navigate to game
    navigateTo('game');
  };
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
      
      {/* Title Section */}
      <div className="relative mb-12 text-center">
        <div className="absolute -inset-4 bg-blue-500/10 blur-xl rounded-full" />
        <h1 className="relative text-8xl font-black text-white tracking-[0.2em] italic text-glow">
          THROUGH<span className="text-blue-500">PUT</span>
        </h1>
        <div className="mt-2 text-blue-400 font-mono tracking-widest text-sm uppercase opacity-70">
          Advanced Logistics Simulation // Ver 2.4.0
        </div>
      </div>
      
      <div className="flex flex-col gap-6 w-full max-w-md relative z-10">
        <div className="panel-industrial p-6 flex flex-col gap-6 bg-slate-900/80 backdrop-blur-sm">
          {/* Difficulty selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Difficulty</label>
            <div className="flex gap-2">
              {(['normal', 'hard', 'brutal'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 px-3 py-2 text-xs font-bold uppercase transition-all duration-200 border ${
                    difficulty === diff
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
          
          {/* Seed input (optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initialization Seed</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="RANDOM_SEED"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 font-mono text-sm text-blue-400 placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={() => setSeedInput(formatSeed(generateSeed()))}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
                title="Generate Random Seed"
              >
                🎲
              </button>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-2">
            <Button size="lg" onClick={handleStartRun} className="w-full h-14">
              Initiate Shift
            </Button>
            
            <Button variant="secondary" onClick={() => navigateTo('unlock_shop')} className="w-full">
              Access Shop ({crates} CRATES)
            </Button>
          </div>
        </div>
        
        {/* Stats Panel */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Runs', value: totalRuns, color: 'text-white' },
            { label: 'Wins', value: totalWins, color: 'text-green-400' },
            { label: 'Best Score', value: bestScores.normal, color: 'text-blue-400' },
          ].map((stat, i) => (
            <div key={i} className="panel-industrial p-3 bg-slate-900/40 text-center">
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative corner elements */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-slate-800 pointer-events-none" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-slate-800 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-slate-800 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-slate-800 pointer-events-none" />
    </div>
  );
}
