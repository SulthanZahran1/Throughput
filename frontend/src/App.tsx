import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from './store';
import { MainMenuScreen } from './components/screens/MainMenuScreen';
import { GameScreen } from './components/screens/GameScreen';
import { PreShiftScreen } from './components/screens/PreShiftScreen';
import { UpgradePickScreen } from './components/screens/UpgradePickScreen';
import { VictoryScreen } from './components/screens/VictoryScreen';
import { RunOverScreen } from './components/screens/RunOverScreen';

// Placeholder screen for Shop
function UnlockShopScreen() {
  const { navigateTo } = useUiStore();
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="panel-industrial p-12 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-black text-white italic">UNLOCK SHOP</h1>
        <p className="text-slate-400 font-mono">ENCRYPTED_DATABASE_ACCESS_REQUIRED</p>
        <div className="w-64 h-1 bg-slate-800 relative overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-blue-500"
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <p className="text-slate-500 text-sm">Feature coming in next security patch...</p>
        <button
          onClick={() => navigateTo('main_menu')}
          className="mt-4 px-8 py-2 border border-slate-700 text-slate-400 hover:text-white hover:border-white transition-all uppercase text-xs font-bold tracking-widest"
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
