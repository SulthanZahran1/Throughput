import { useEffect, useCallback } from 'react';
import { useGameStore, useRunStore, useUiStore } from '../../store';
import { useGameLoop } from '../../hooks';
import { Button } from '../ui/Button';
import { formatTime } from '../../utils/formatters';
import { GRID_CELL_SIZE, GRID_GAP, ITEM_COLORS, SLOT_COLORS } from '../../constants/config';
import { generateShiftResult } from '../../engine/simulation';
import { getRandomModifier } from '../../data/modifiers';
import { UPGRADES } from '../../data/upgrades';
import type { Slot, Crane, Order, SimulationEvent, SimulationContext } from '../../engine/types';

export function GameScreen() {
  const { context, isPaused, setPaused, reset: resetGame } = useGameStore();
  const { 
    hp, maxHp, currentShift, isActive, rng, usedModifiers,
    applyShiftResult, damageHp, advanceToNextShift, setNextModifier, endRun,
    generateOffering
  } = useRunStore();
  const { navigateTo } = useUiStore();
  
  // Stable callbacks for game loop - MUST be memoized to prevent effect restart
  const handleTick = useCallback((ctx: SimulationContext, events: SimulationEvent[]) => {
    useGameStore.getState().setContext(ctx);
    useGameStore.getState().addEvents(events);
  }, []);
  
  const handleHpLoss = useCallback((amount: number) => {
    useRunStore.getState().damageHp(amount);
  }, []);
  
  // Handle shift end logic directly
  const handleShiftEnd = useCallback(() => {
    if (!context) return;
    
    console.log('Processing shift end...');
    
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
        return;
      }
    }
    
    // Check for victory (completed 8 shifts)
    if (currentShift >= 8) {
      endRun(true);
      resetGame();
      navigateTo('victory');
      return;
    }
    
    // Generate next modifier
    if (rng) {
      const nextMod = getRandomModifier(usedModifiers, rng);
      setNextModifier(nextMod.id);
    }
    
    // Advance to next shift
    advanceToNextShift();
    
    // Generate card offerings for the upgrade pick screen
    const allUpgradeIds = UPGRADES.map(u => u.id);
    generateOffering(allUpgradeIds, 3);
    
    resetGame();
    
    // Navigate to upgrade pick
    navigateTo('upgrade_pick');
  }, [context, currentShift, rng, usedModifiers, applyShiftResult, damageHp, advanceToNextShift, setNextModifier, endRun, generateOffering, resetGame, navigateTo]);
  
  const handleShiftEndCallback = useCallback(() => {
    console.log('Shift ended, handling...');
    handleShiftEnd();
  }, [handleShiftEnd]);
  
  // Set up game loop
  const { setContext } = useGameLoop({
    isActive: context !== null && isActive,
    isPaused,
    onTick: handleTick,
    onShiftEnd: handleShiftEndCallback,
    onHpLoss: handleHpLoss,
  });
  
  // Set context when it changes
  useEffect(() => {
    if (context) {
      setContext(context);
    }
  }, [context, setContext]);
  
  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  const grid = context.grid;
  const gridWidth = grid.width * (GRID_CELL_SIZE + GRID_GAP);
  const gridHeight = grid.height * (GRID_CELL_SIZE + GRID_GAP);
  
  return (
    <div className="flex flex-col h-screen p-4 gap-4 bg-[#0a0c10] relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header / Dashboard */}
      <div className="panel-industrial flex items-center justify-between p-1 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center">
          {/* Shift Info */}
          <div className="px-6 py-2 border-r border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status: Active</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white italic">SHIFT {currentShift}</span>
              <span className="text-xs font-bold text-slate-500">/ 08</span>
            </div>
          </div>
          
          {/* Timer */}
          <div className="px-6 py-2 border-r border-slate-800 min-w-[140px]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Time Remaining</div>
            <div className={`text-2xl font-mono font-bold ${context.shiftTimeRemaining < 20 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
              {formatTime(context.shiftTimeRemaining)}
            </div>
          </div>
          
          {/* Integrity (HP) */}
          <div className="px-6 py-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">System Integrity</div>
            <div className="flex gap-1.5">
              {Array.from({ length: maxHp }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-2 transform skew-x-[-20deg] transition-colors duration-500 ${
                    i < hp ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 pr-4">
          <div className="text-right px-4 border-l border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Queue Load</div>
            <div className="text-xl font-mono font-bold text-white">
              {String(context.orders.length).padStart(2, '0')} <span className="text-slate-600">/ 10</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPaused(!isPaused)}
              className="w-24"
            >
              {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('main_menu')}
              className="w-10 h-8 p-0"
            >
              ✕
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0 z-10">
        {/* Left Panel: Orders */}
        <div className="w-72 flex flex-col gap-3">
          <div className="panel-industrial flex-1 flex flex-col bg-slate-900/40">
            <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
              <h3 className="text-xs font-black text-white uppercase tracking-tighter">Incoming Orders</h3>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            </div>
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
              {context.orders.slice(0, 8).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {context.orders.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                  <div className="text-4xl">📡</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest">Scanning for signals...</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Center: Grid Area */}
        <div className="flex-1 panel-industrial bg-[#05070a] flex items-center justify-center overflow-hidden border-slate-800/50 shadow-inner">
          {/* Subtle floor texture */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div
            className="relative"
            style={{
              width: gridWidth,
              height: gridHeight,
            }}
          >
            {/* Slots */}
            {Array.from(grid.slots.values()).map((slot) => (
              <SlotView key={slot.key} slot={slot} />
            ))}
            
            {/* Cranes */}
            {context.cranes.map((crane) => (
              <CraneView key={crane.id} crane={crane} />
            ))}
          </div>
        </div>
        
        {/* Right Panel: Stats & Details */}
        <div className="w-56 flex flex-col gap-4">
          <div className="panel-industrial p-4 bg-slate-900/40">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Shift Performance</h3>
            <div className="space-y-4">
              <StatItem label="Processed" value={context.stats.ordersCompleted} color="text-white" />
              <StatItem label="Breached" value={context.stats.ordersFailed} color="text-red-400" />
              <StatItem label="Storage" value={context.stats.itemsStored} color="text-blue-400" />
              <StatItem label="Retrieval" value={context.stats.itemsRetrieved} color="text-green-400" />
              <StatItem label="Priority" value={context.stats.vipOrdersCompleted} color="text-yellow-400" />
            </div>
          </div>

          <div className="panel-industrial p-4 flex-1 bg-slate-900/20 border-dashed border-slate-800 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">System Logs</h3>
            <div className="font-mono text-[9px] text-slate-500 space-y-1">
              <div>{'>'} Initializing neuro-grid...</div>
              <div>{'>'} Load balancing active</div>
              {context.cranes.map((crane) => (
                <CraneLogLine key={crane.id} crane={crane} />
              ))}
              <div className="text-blue-500/50 animate-pulse">{'>'} Ready for throughput...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
      <span className={`text-lg font-mono font-bold leading-none ${color}`}>{value}</span>
    </div>
  );
}

/**
 * Convert crane state to user-friendly log message
 */
function getCraneStatusText(crane: Crane): string {
  const craneNum = crane.id.split('-')[1] || '0';
  const jobType = crane.currentJob?.jobType;
  
  switch (crane.state) {
    case 'IDLE':
      return `Crane-${craneNum}: STANDBY`;
      
    case 'MOVING_TO_SOURCE':
      return `Crane-${craneNum}: MOVING → PICKUP`;
      
    case 'ACQUIRING':
      return `Crane-${craneNum}: ACQUIRING ${Math.round(crane.transferProgress * 100)}%`;
      
    case 'MOVING_TO_DEST':
      if (jobType === 'retrieve') {
        return `Crane-${craneNum}: MOVING → OUTPUT [${crane.heldItem?.type.toUpperCase() || '?'}]`;
      }
      return `Crane-${craneNum}: MOVING → STORAGE [${crane.heldItem?.type.toUpperCase() || '?'}]`;
      
    case 'DEPOSITING':
      return `Crane-${craneNum}: DEPOSITING [${crane.heldItem?.type.toUpperCase() || '?'}] ${Math.round(crane.transferProgress * 100)}%`;
      
    default:
      return `Crane-${craneNum}: UNKNOWN`;
  }
}

/**
 * Get color class for crane state
 */
function getCraneStatusColor(crane: Crane): string {
  switch (crane.state) {
    case 'IDLE':
      return 'text-slate-500';
    case 'MOVING_TO_SOURCE':
      return 'text-blue-400';
    case 'ACQUIRING':
      return 'text-cyan-400';
    case 'MOVING_TO_DEST':
      return 'text-blue-400';
    case 'DEPOSITING':
      return 'text-green-400';
    default:
      return 'text-slate-500';
  }
}

function CraneLogLine({ crane }: { crane: Crane }) {
  const statusText = getCraneStatusText(crane);
  const colorClass = getCraneStatusColor(crane);
  
  return (
    <div className={`${colorClass} transition-colors duration-200`}>
      {'>'} {statusText}
    </div>
  );
}

function SlotView({ slot }: { slot: Slot }) {
  const x = slot.x * (GRID_CELL_SIZE + GRID_GAP);
  const y = slot.y * (GRID_CELL_SIZE + GRID_GAP);
  
  const baseColor = SLOT_COLORS[slot.type];
  const itemColor = slot.item ? ITEM_COLORS[slot.item.type] : null;
  
  return (
    <div
      className="absolute border border-slate-800/30 transition-all duration-300"
      style={{
        left: x,
        top: y,
        width: GRID_CELL_SIZE,
        height: GRID_CELL_SIZE,
        backgroundColor: baseColor,
      }}
    >
      {/* Visual indicators for special slots */}
      {slot.type === 'input' && (
        <div className="absolute inset-0 border-2 border-emerald-500/30 animate-pulse">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-[8px] px-1 font-black text-white rounded-sm">IN</div>
        </div>
      )}
      {slot.type === 'output' && (
        <div className="absolute inset-0 border-2 border-red-500/30">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-red-500 text-[8px] px-1 font-black text-white rounded-sm">OUT</div>
        </div>
      )}

      {/* Item Rendering */}
      {slot.item && (
        <div 
          className="absolute inset-1 rounded-sm shadow-lg transform transition-transform duration-200 hover:scale-105"
          style={{ 
            backgroundColor: itemColor || '#fff',
            boxShadow: `0 0 15px ${itemColor}44`,
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-full h-[1px] bg-white rotate-45" />
            <div className="w-full h-[1px] bg-white -rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

function CraneView({ crane }: { crane: Crane }) {
  const x = crane.x * (GRID_CELL_SIZE + GRID_GAP);
  const y = crane.y * (GRID_CELL_SIZE + GRID_GAP);
  
  return (
    <div
      className="absolute z-20 transition-all duration-150 ease-linear pointer-events-none"
      style={{
        left: x,
        top: y,
        width: GRID_CELL_SIZE,
        height: GRID_CELL_SIZE,
      }}
    >
      {/* Crane Body */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500 bg-yellow-500/20 rounded-sm relative shadow-[0_0_10px_rgba(234,179,8,0.3)]">
          {/* Corner Bolts */}
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-yellow-600 rounded-full" />
          <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-yellow-600 rounded-full" />
          <div className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-yellow-600 rounded-full" />
          <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-yellow-600 rounded-full" />
          
          {/* ID Label */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-black text-yellow-500 whitespace-nowrap bg-slate-950 px-1 border border-yellow-500/50">
            CRANE_{crane.id.split('-')[1]}
          </div>

          {/* Held Item */}
          {crane.heldItem && (
            <div
              className="absolute inset-1.5 rounded-sm animate-pulse"
              style={{ 
                backgroundColor: ITEM_COLORS[crane.heldItem.type],
                boxShadow: `0 0 10px ${ITEM_COLORS[crane.heldItem.type]}`
              }}
            />
          )}
        </div>
      </div>
      
      {/* Gantry Rails (Visual only) */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500/10 -translate-x-1/2 -z-10" />
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-yellow-500/10 -translate-y-1/2 -z-10" />
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const progress = order.deadline / order.maxDeadline;
  const isUrgent = progress < 0.3;
  const isVip = order.priority === 'vip';
  const itemColor = ITEM_COLORS[order.itemType];
  
  return (
    <div
      className={`relative p-2.5 transition-all border ${
        isVip 
          ? 'border-yellow-500/40 bg-yellow-500/5' 
          : 'border-slate-800 bg-slate-800/30'
      } ${isUrgent ? 'border-red-500/50 bg-red-500/5' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {isVip && <span className="text-[10px] text-yellow-400">👑</span>}
            <span className="text-[10px] font-black text-white uppercase tracking-wider">{order.type}</span>
          </div>
          <span className="text-[8px] font-bold text-slate-500">#{order.id.slice(0, 4)}</span>
        </div>
        <div
          className="w-6 h-6 rounded-sm border border-white/20 shadow-inner"
          style={{ 
            backgroundColor: itemColor,
            boxShadow: `0 0 10px ${itemColor}44`
          }}
        />
      </div>
      
      {/* Deadline Bar Container */}
      <div className="relative h-1 bg-slate-900 rounded-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-1000 ${
            isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.max(0, progress * 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-1.5">
        <span className={`text-[8px] font-bold ${isUrgent ? 'text-red-500' : 'text-slate-500'}`}>
          {isUrgent ? 'CRITICAL_LATENCY' : 'NOMINAL_FLOW'}
        </span>
        <span className="text-[9px] font-mono text-white font-bold">
          {Math.ceil(order.deadline)}S
        </span>
      </div>
    </div>
  );
}
