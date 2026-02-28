import React from 'react';
import { useUiStore, useRunStore, useMetaStore } from '../../store';
import { Button } from '../ui/Button';

export function RunOverScreen() {
  const { navigateTo } = useUiStore();
  const { recordRun } = useMetaStore();
  
  React.useEffect(() => {
    const result = useRunStore.getState().endRun(false);
    if (result) {
      recordRun(result);
    }
  }, [recordRun]);
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 overflow-hidden text-center">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 via-transparent to-transparent" />
      
      <div className="relative z-10 space-y-8 max-w-2xl">
        <div className="relative">
          <div className="absolute -inset-10 bg-red-500/20 blur-3xl rounded-full" />
          <h1 className="relative text-9xl font-black text-red-500 italic tracking-tighter text-glow">
            TERMINATED
          </h1>
          <div className="text-xl font-mono text-red-500/70 tracking-widest uppercase">
            System Failure // Critical Integrity Loss
          </div>
        </div>
        
        <div className="panel-industrial p-8 bg-slate-900/60 backdrop-blur-sm border-red-500/30">
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            The facility has reached critical mass. Your operational contract has been voided due to catastrophic mismanagement.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-950/50 p-4 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Crates Salvaged</div>
              <div className="text-3xl font-black text-white">+0</div>
            </div>
            <div className="bg-slate-950/50 p-4 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Failure Node</div>
              <div className="text-3xl font-black text-red-400">CORE_SYNC</div>
            </div>
          </div>
          
          <Button
            size="lg"
            variant="danger"
            onClick={() => navigateTo('main_menu')}
            className="w-full h-16"
          >
            Reboot System
          </Button>
        </div>
      </div>
    </div>
  );
}
