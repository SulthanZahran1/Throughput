import { useUiStore, useRunStore, useGameStore } from '../../store';
import { Button } from '../ui/Button';
import { createRng } from '../../engine/rng';
import { createGrid } from '../../engine/grid';
import { createSimulationContext } from '../../engine/simulation';
import { generateShiftParameters } from '../../data/escalation';
import { applyUpgradesToFlags } from '../../data/upgrades';

export function PreShiftScreen() {
  const { navigateTo } = useUiStore();
  const { currentShift, currentModifier, hp, maxHp, seed, difficulty, heldUpgrades } = useRunStore();
  const initializeShift = useGameStore(state => state.initializeShift);
  
  const handleBeginOperation = () => {
    // Initialize the shift context before navigating to game
    const flags = applyUpgradesToFlags({}, heldUpgrades.map(u => u.id));
    
    const params = generateShiftParameters(
      currentShift,
      seed,
      difficulty,
      heldUpgrades.map(u => u.id),
      currentModifier,
      flags
    );
    
    // Create simulation context
    const rng = createRng(seed + currentShift); // Different seed per shift
    const grid = createGrid({
      width: params.gridWidth,
      height: params.gridHeight,
      blockedCells: params.blockedCells,
      initialInventory: params.initialInventory,
    }, rng);
    
    const context = createSimulationContext(
      seed,
      currentShift,
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
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-lg">
        <div className="panel-industrial p-8 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center gap-8">
          <div className="text-center">
            <div className="text-blue-500 font-mono tracking-[0.3em] uppercase text-xs mb-2">System Readiness Check</div>
            <h1 className="text-6xl font-black text-white italic tracking-tighter">SHIFT {currentShift}</h1>
          </div>
          
          {currentModifier && (
            <div className="w-full bg-red-500/10 border border-red-500/30 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-red-500 text-[8px] font-black text-white uppercase">Active Hazard</div>
              <div className="text-red-400 font-black text-xs uppercase tracking-widest mb-1">Environmental Modifier</div>
              <div className="text-white font-bold text-lg">{currentModifier}</div>
            </div>
          )}
          
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Integrity</div>
            <div className="flex gap-2">
              {Array.from({ length: maxHp }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-3 transform skew-x-[-20deg] ${
                    i < hp ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          
          <div className="flex flex-col gap-3 w-full">
            <Button
              size="lg"
              onClick={handleBeginOperation}
              className="w-full h-16 text-xl"
            >
              Begin Operation
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => navigateTo('main_menu')}
              className="text-xs opacity-50 hover:opacity-100"
            >
              Abort Mission
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-blue-500/10 -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-blue-500/10 -translate-x-1/2" />
    </div>
  );
}
