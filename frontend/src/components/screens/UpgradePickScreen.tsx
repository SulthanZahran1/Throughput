import { useUiStore, useRunStore } from '../../store';
import { UPGRADES } from '../../data/upgrades';

export function UpgradePickScreen() {
  const { navigateTo } = useUiStore();
  const { offeredCards, pickUpgrade } = useRunStore();
  
  const handlePick = (upgradeId: string) => {
    pickUpgrade(upgradeId);
    navigateTo('pre_shift');
  };
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-6xl">
        <div className="text-center mb-12">
          <div className="text-blue-500 font-mono tracking-[0.3em] uppercase text-xs mb-2">Technical Enhancement Required</div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter text-glow">SELECT UPGRADE</h1>
        </div>
        
        <div className="flex justify-center gap-6">
          {offeredCards.map((cardId) => {
            const upgrade = UPGRADES.find(u => u.id === cardId);
            if (!upgrade) return null;
            
            return (
              <div
                key={cardId}
                onClick={() => handlePick(cardId)}
                className="group relative w-72 h-[450px] cursor-pointer"
              >
                {/* Card Background */}
                <div className="absolute inset-0 panel-industrial bg-slate-900/90 border-slate-700 group-hover:border-blue-500/50 group-hover:bg-slate-800 transition-all duration-300">
                  {/* Internal Glow */}
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
                  
                  {/* Schematic Details */}
                  <div className="absolute top-4 left-4 right-4 h-[1px] bg-slate-800" />
                  <div className="absolute bottom-4 left-4 right-4 h-[1px] bg-slate-800" />
                  
                  <div className="p-6 h-full flex flex-col">
                    <div className="mb-2 flex justify-between items-start">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Model: {upgrade.id.slice(0, 8)}
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors uppercase italic leading-tight">
                      {upgrade.name}
                    </h3>
                    
                    <div className="flex-1">
                      <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium italic">
                        "{upgrade.description}"
                      </p>
                      
                      <div className="space-y-3">
                        {/* Fake technical stats */}
                        <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1">
                          <span className="text-slate-500 uppercase">Latency Impact</span>
                          <span className="text-green-400 font-mono">-12ms</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1">
                          <span className="text-slate-500 uppercase">Power Draw</span>
                          <span className="text-yellow-400 font-mono">+4.2kW</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] text-center mb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        Install Component
                      </div>
                      <div className="h-12 w-full border border-slate-700 flex items-center justify-center bg-slate-950 group-hover:border-blue-500 transition-colors">
                         <span className="text-xs font-bold text-slate-500 group-hover:text-white uppercase tracking-widest">Connect Terminal</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative outer corners */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-slate-600 group-hover:border-blue-500 transition-colors" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-slate-600 group-hover:border-blue-500 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
