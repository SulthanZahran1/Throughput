// Shift Summary Screen - Results after completing or failing a shift
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../constants/colors';
import { getNextLevel, getLevelById } from '../../data/levels';
import type { ShiftResult } from '../../types/level';

interface ShiftSummaryScreenProps {
    result: ShiftResult;
}

export function ShiftSummaryScreen({ result }: ShiftSummaryScreenProps) {
    const setScreen = useUIStore((state) => state.setScreen);
    const loadLevel = useGameStore((state) => state.loadLevel);
    const resetGame = useGameStore((state) => state.resetGame);

    const isWin = result.outcome === 'win';
    const nextLevel = getNextLevel(result.levelId);
    const currentLevel = getLevelById(result.levelId);

    const handleRetry = () => {
        if (currentLevel) {
            loadLevel(currentLevel);
            setScreen('game');
        }
    };

    const handleNextLevel = () => {
        if (nextLevel) {
            loadLevel(nextLevel);
            setScreen('game');
        }
    };

    const handleLevelSelect = () => {
        resetGame();
        setScreen('level_select');
    };

    const renderStars = () => {
        return (
            <div className="text-5xl mb-4">
                {[1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className="transition-all duration-300"
                        style={{
                            color: i <= result.starsEarned ? '#facc15' : '#475569',
                        }}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-8"
            style={{ backgroundColor: COLORS.bgPrimary }}
        >
            {/* Header */}
            <h1
                className={`text-4xl font-bold mb-2 ${isWin ? 'text-green-400' : 'text-red-400'
                    }`}
            >
                {isWin ? 'SHIFT COMPLETE' : 'SHIFT FAILED'}
            </h1>

            {currentLevel && (
                <p className="text-slate-400 mb-6">
                    Level {result.levelId}: {currentLevel.name}
                </p>
            )}

            {/* Stars */}
            {renderStars()}

            {/* Stats */}
            <div
                className="rounded-lg p-6 mb-6 w-full max-w-md"
                style={{ backgroundColor: COLORS.bgSecondary }}
            >
                <div className="space-y-3 font-mono">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Orders Completed</span>
                        <span className="text-white">{result.ordersCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Orders Failed</span>
                        <span
                            className={
                                result.ordersFailed > 0 ? 'text-red-400' : 'text-white'
                            }
                        >
                            {result.ordersFailed}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Avg Cycle Time</span>
                        <span className="text-white">{result.avgCycleTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Throughput</span>
                        <span style={{ color: COLORS.crane }}>
                            {Math.round(result.jph)} JPH
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Duration</span>
                        <span className="text-white">
                            {Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Feature Unlock */}
            {result.newUnlock && (
                <div
                    className="rounded-lg p-4 mb-6 text-center border-2"
                    style={{
                        backgroundColor: '#22c55e20',
                        borderColor: '#22c55e',
                    }}
                >
                    <span className="text-2xl mr-2">🔓</span>
                    <span className="text-green-400 font-semibold">
                        Unlocked: {result.newUnlock.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
                <button
                    onClick={handleRetry}
                    className="px-6 py-3 rounded-lg font-semibold text-lg border-2 transition-all duration-200 hover:bg-slate-800"
                    style={{
                        borderColor: COLORS.crane,
                        color: COLORS.crane,
                    }}
                >
                    Retry
                </button>

                {isWin && nextLevel && (
                    <button
                        onClick={handleNextLevel}
                        className="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105"
                        style={{
                            backgroundColor: COLORS.crane,
                            color: COLORS.bgPrimary,
                        }}
                    >
                        Next Level
                    </button>
                )}

                <button
                    onClick={handleLevelSelect}
                    className="px-6 py-3 rounded-lg font-semibold text-lg text-slate-400 border border-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-200"
                >
                    Level Select
                </button>
            </div>
        </div>
    );
}
