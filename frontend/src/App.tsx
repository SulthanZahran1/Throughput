import { useUIStore } from './store/uiStore';
import { GameScreen } from './components/screens/GameScreen';
import { COLORS } from './constants/colors';

function MainMenu() {
  const setScreen = useUIStore((state) => state.setScreen);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
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
          onClick={() => setScreen('game')}
        >
          Start Game
        </button>

        <button
          className="px-6 py-3 rounded-lg font-semibold text-lg border-2 transition-all duration-200 hover:bg-slate-800"
          style={{
            borderColor: COLORS.crane,
            color: COLORS.crane,
          }}
          onClick={() => setScreen('sandbox')}
        >
          Sandbox Mode
        </button>

        <button className="px-6 py-3 rounded-lg font-semibold text-lg text-slate-400 border border-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-200">
          Settings
        </button>
      </div>

      {/* Version */}
      <p className="absolute bottom-4 text-slate-600 text-sm font-mono">
        v1.0 — Phase 0
      </p>
    </div>
  );
}

function App() {
  const currentScreen = useUIStore((state) => state.currentScreen);

  switch (currentScreen) {
    case 'game':
    case 'sandbox':
      return <GameScreen />;
    default:
      return <MainMenu />;
  }
}

export default App;
