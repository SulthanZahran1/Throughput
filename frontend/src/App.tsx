
import { useState, useEffect } from 'react';
import { Grid } from './components/game/Grid';
import { Player } from './components/game/Player';
import { Item } from './components/game/Item';
import { Robot } from './components/game/Robot';
import { OrderQueue } from './components/game/OrderQueue';
import { UpgradeModal } from './components/ui/UpgradeModal';
import { VictoryScreen } from './components/screens/VictoryScreen';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import { useSwipe } from './hooks/useSwipe';
import { TARGET_RUN_TIME } from './constants/config';

// Format milliseconds to MM:SS
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Check if device is mobile (touch device with small screen)
const isMobileDevice = () => {
  return 'ontouchstart' in window && window.innerWidth < 1024;
};

function App() {
  const isGameOver = useGameStore(state => state.isGameOver);
  const hasWon = useGameStore(state => state.hasWon);
  const items = useGameStore(state => state.items);
  const robots = useGameStore(state => state.robots);
  const runTime = useGameStore(state => state.runTime);
  const xp = useGameStore(state => state.xp);
  const level = useGameStore(state => state.level);
  const upgrades = useGameStore(state => state.upgrades);
  const restart = useGameStore(state => state.restart);

  const [showOrientationPrompt, setShowOrientationPrompt] = useState(false);

  // Detect orientation changes on mobile
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOrientationPrompt(isMobileDevice() && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Pause game when won or game over
  useGameLoop(!isGameOver && !hasWon);
  useKeyboard();
  useSwipe();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-2 sm:p-4 md:p-8">
      {/* Landscape Orientation Prompt for Mobile */}
      {showOrientationPrompt && (
        <div className="fixed inset-0 bg-gray-950/95 z-[100] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-6 animate-bounce">📱</div>
          <h2 className="text-2xl font-bold text-amber-400 mb-4">Rotate Your Device</h2>
          <p className="text-gray-300 mb-6 max-w-xs">
            For the best gameplay experience, please rotate your device to landscape mode.
          </p>
          <div className="text-4xl animate-pulse">↻</div>
          <button
            onClick={() => setShowOrientationPrompt(false)}
            className="mt-8 px-4 py-2 text-sm text-gray-400 underline"
          >
            Continue in portrait anyway
          </button>
        </div>
      )}

      {/* Stacked layout on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row gap-2 sm:gap-4 md:gap-8 items-center">
        <div className="relative">
          <Grid>
            {/* Game Entities rendered inside Grid using CSS Grid positioning */}
            <Player />
            {items.map(item => (
              <Item key={item.id} item={item} />
            ))}
            {robots.map(robot => (
              <Robot key={robot.id} robot={robot} />
            ))}
          </Grid>

          {/* UI Overlay - Top Left - Compact on mobile */}
          <div className="absolute top-1 left-1 sm:top-4 sm:left-4 text-white font-mono bg-black/50 p-1 sm:p-2 rounded space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
            {/* Run Timer with Progress */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-amber-400 font-bold text-xs sm:text-base">⏱️ SHIFT</span>
                <span className="text-xs sm:text-lg">{formatTime(runTime)} / {formatTime(TARGET_RUN_TIME)}</span>
              </div>
              <div className="w-24 sm:w-48 h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-200"
                  style={{ width: `${Math.min((runTime / TARGET_RUN_TIME) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>Lv{level} | XP:{xp}</div>
            <div>Robots: {robots.length}</div>
            {upgrades.length > 0 && (
              <div className="text-[10px] sm:text-xs text-gray-400">
                Upgrades: {upgrades.length}
              </div>
            )}
          </div>

          {/* Victory Screen */}
          {hasWon && <VictoryScreen />}

          {/* Game Over Overlay */}
          {isGameOver && !hasWon && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col z-50 p-4">
              <h1 className="text-2xl sm:text-4xl font-bold text-red-500 mb-4">GAME OVER</h1>
              <button
                onClick={restart}
                className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
              >
                Restart
              </button>
            </div>
          )}
        </div>

        <OrderQueue />
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal />
    </div>
  );
}

export default App;
