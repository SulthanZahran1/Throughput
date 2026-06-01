import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore, useMetaStore } from './store';
import { MainMenuScreen } from './components/screens/MainMenuScreen';
import { GameScreen } from './components/screens/GameScreen';
import { PreShiftScreen } from './components/screens/PreShiftScreen';
import { UpgradePickScreen } from './components/screens/UpgradePickScreen';
import { VictoryScreen } from './components/screens/VictoryScreen';
import { RunOverScreen } from './components/screens/RunOverScreen';
import { api } from './api';
import { UPGRADES } from './data/upgrades';

function UnlockShopScreen() {
  const { navigateTo } = useUiStore();
  const { crates, unlockedCards, unlockCard } = useMetaStore();
  const lockedUpgrades = UPGRADES.filter(upgrade => !unlockedCards.includes(upgrade.id));
  
  return (
    <div className="relative min-h-screen overflow-y-auto bg-slate-950 p-6 text-white">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-blue-500 font-mono tracking-[0.3em] uppercase text-xs mb-2">Roguelite Unlock Database</div>
            <h1 className="text-4xl font-black italic tracking-tighter text-glow">UNLOCK SHOP</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Spend crates from completed runs to expand future upgrade offerings. Starting cards remain available by default.</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 font-mono text-sm text-yellow-200">
            CRATES: <span className="text-2xl font-black">{crates}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lockedUpgrades.map(upgrade => {
            const canAfford = crates >= upgrade.unlockCost;
            return (
              <div key={upgrade.id} className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{upgrade.category} · {upgrade.rarity}</div>
                    <h2 className="mt-1 text-xl font-black uppercase italic">{upgrade.name}</h2>
                  </div>
                  <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-yellow-300">{upgrade.unlockCost}</div>
                </div>
                <p className="min-h-12 text-sm text-slate-400">{upgrade.description}</p>
                {upgrade.prerequisites.length > 0 && (
                  <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-500">Requires: {upgrade.prerequisites.join(', ')}</p>
                )}
                <button
                  onClick={() => unlockCard(upgrade.id)}
                  disabled={!canAfford}
                  className="mt-5 w-full rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                >
                  {canAfford ? 'Unlock Card' : 'Insufficient Crates'}
                </button>
              </div>
            );
          })}
        </div>

        {lockedUpgrades.length === 0 && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center text-green-200">All upgrades unlocked.</div>
        )}

        <button
          onClick={() => navigateTo('main_menu')}
          className="my-8 rounded-full border border-slate-700 px-8 py-3 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:border-white hover:text-white"
        >
          Back to Terminal
        </button>
      </div>
    </div>
  );
}

const screenComponents: Record<string, React.FC> = {
  main_menu: MainMenuScreen,
  pre_shift: PreShiftScreen,
  game: GameScreen,
  upgrade_pick: UpgradePickScreen,
  victory: VictoryScreen,
  run_over: RunOverScreen,
  unlock_shop: UnlockShopScreen,
};

function ScreenTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const { currentScreen } = useUiStore();
  const { syncFromBackend, deviceId } = useMetaStore();

  // Sync meta from backend on mount
  React.useEffect(() => {
    api.getMeta(deviceId).then((backendMeta) => {
      if (backendMeta) {
        syncFromBackend(backendMeta);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ScreenComponent = screenComponents[currentScreen] || MainMenuScreen;
  
  return (
    <div className="w-full h-screen bg-black overflow-hidden selection:bg-blue-500/30">
      {/* Global CRT Flicker Effect */}
      <div className="fixed inset-0 pointer-events-none z-[100] animate-pulse opacity-[0.03] bg-white mix-blend-overlay" />
      
      <AnimatePresence mode="wait">
        <ScreenTransition key={currentScreen}>
          <ScreenComponent />
        </ScreenTransition>
      </AnimatePresence>
    </div>
  );
}
