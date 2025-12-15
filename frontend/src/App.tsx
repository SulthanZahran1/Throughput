import { useUIStore } from './store/uiStore';
import { useGameStore } from './store/gameStore';
import { GameScreen } from './components/screens/GameScreen';
import { LevelSelectScreen } from './components/screens/LevelSelectScreen';
import { ShiftSummaryScreen } from './components/screens/ShiftSummaryScreen';
import { COLORS } from './constants/colors';
import { getLevelById } from './data/levels';

function MainMenu() {
  const setScreen = useUIStore((state) => state.setScreen);
  const loadLevel = useGameStore((state) => state.loadLevel);

  const handleStartGame = () => {
    // Go to level select for progression
    setScreen('level_select');
  };

  const handleSandbox = () => {
    // Load a sandbox-like config (16x16, all features)
    const sandboxLevel = getLevelById('1'); // Use level 1 as base for sandbox
    if (sandboxLevel) {
      loadLevel({
        ...sandboxLevel,
        id: 'sandbox',
        name: 'Sandbox',
        gridWidth: 16,
        gridHeight: 16,
        shiftDuration: 600, // 10 minutes
        unlockedFeatures: ['zones', 'dual_command', 'retrieval_modes'],
      });
    }
    setScreen('sandbox');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: COLORS.bgPrimary }}
    >
      {/* Header */}
      <h1
        className="text-5xl font-bold mb-2 tracking-tight"
        style={{ color: COLORS.crane }}
      >
        THROUGHPUT
      </h1>
      <p className="text-slate-400 mb-12 text-lg">
        The Warehouse Optimization Game
      </p>

      {/* Main Menu Buttons */}
      <div className="flex flex-col gap-4 w-64">
        <button
          className="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: COLORS.crane,
            color: COLORS.bgPrimary,
          }}
          onClick={handleStartGame}
        >
          Start Game
        </button>

        <button
          className="px-6 py-3 rounded-lg font-semibold text-lg border-2 transition-all duration-200 hover:bg-slate-800"
          style={{
            borderColor: COLORS.crane,
            color: COLORS.crane,
          }}
          onClick={handleSandbox}
        >
          Sandbox Mode
        </button>

        <button className="px-6 py-3 rounded-lg font-semibold text-lg text-slate-400 border border-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-200">
          Settings
        </button>
      </div>

      {/* Version */}
      <p className="absolute bottom-4 text-slate-600 text-sm font-mono">
        v1.0 — Phase 3
      </p>
    </div>
  );
}

function App() {
  const currentScreen = useUIStore((state) => state.currentScreen);
  const shiftResult = useGameStore((state) => state.getShiftResult?.());

  switch (currentScreen) {
    case 'level_select':
      return <LevelSelectScreen />;
    case 'shift_summary':
      if (shiftResult) {
        return <ShiftSummaryScreen result={shiftResult} />;
      }
      return <LevelSelectScreen />;
    case 'game':
    case 'sandbox':
      return <GameScreen />;
    default:
      return <MainMenu />;
  }
}

export default App;

