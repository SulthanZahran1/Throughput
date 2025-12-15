// Level Select Screen - Grid of level cards showing progress and unlock status
import { useUIStore } from '../../store/uiStore';
import { useProgressStore } from '../../store/progressStore';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../constants/colors';
import { LEVELS, getLevelById } from '../../data/levels';

export function LevelSelectScreen() {
    const setScreen = useUIStore((state) => state.setScreen);
    const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked);
    const getLevelProgress = useProgressStore((state) => state.getLevelProgress);
    const totalStars = useProgressStore((state) => state.totalStars);
    const loadLevel = useGameStore((state) => state.loadLevel);

    const handleLevelClick = (levelId: string) => {
        if (!isLevelUnlocked(levelId)) return;

        const level = getLevelById(levelId);
        if (!level) return;

        loadLevel(level);
        setScreen('game');
    };

    const renderStars = (stars: number) => {
        return (
            <span className="text-lg">
                {[1, 2, 3].map((i) => (
                    <span
                        key={i}
                        style={{ color: i <= stars ? '#facc15' : '#475569' }}
                    >
                        ★
                    </span>
                ))}
            </span>
        );
    };

    // Group levels by act
    const act1 = LEVELS.filter((l) => l.act === 1);
    const act2 = LEVELS.filter((l) => l.act === 2);

    return (
        <div
            className="min-h-screen p-8"
            style={{ backgroundColor: COLORS.bgPrimary }}
        >
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setScreen('main_menu')}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xl">★</span>
                        <span className="text-white font-mono text-lg">
                            {totalStars} / {LEVELS.length * 3}
                        </span>
                    </div>
                </div>
                <h1
                    className="text-4xl font-bold mt-4"
                    style={{ color: COLORS.crane }}
                >
                    Level Select
                </h1>
            </div>

            {/* Act 1: Tutorial */}
            <div className="max-w-4xl mx-auto mb-8">
                <h2 className="text-xl font-semibold text-slate-300 mb-4">
                    Act 1: Tutorial
                </h2>
                <div className="grid grid-cols-5 gap-4">
                    {act1.map((level) => {
                        const progress = getLevelProgress(level.id);
                        const unlocked = isLevelUnlocked(level.id);

                        return (
                            <button
                                key={level.id}
                                onClick={() => handleLevelClick(level.id)}
                                disabled={!unlocked}
                                className={`
                                    relative p-4 rounded-lg border-2 transition-all duration-200
                                    ${unlocked
                                        ? 'hover:scale-105 cursor-pointer'
                                        : 'opacity-50 cursor-not-allowed'}
                                `}
                                style={{
                                    backgroundColor: COLORS.bgSecondary,
                                    borderColor: unlocked
                                        ? progress?.stars
                                            ? '#22c55e'
                                            : COLORS.crane
                                        : '#475569',
                                }}
                            >
                                {!unlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                        <span className="text-2xl">🔒</span>
                                    </div>
                                )}
                                <div className="text-2xl font-bold text-white">
                                    {level.id}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                    {level.name}
                                </div>
                                <div className="mt-2">
                                    {renderStars(progress?.stars ?? 0)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Act 2: Automation */}
            <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-300 mb-4">
                    Act 2: Automation
                </h2>
                <div className="grid grid-cols-5 gap-4">
                    {act2.map((level) => {
                        const progress = getLevelProgress(level.id);
                        const unlocked = isLevelUnlocked(level.id);

                        return (
                            <button
                                key={level.id}
                                onClick={() => handleLevelClick(level.id)}
                                disabled={!unlocked}
                                className={`
                                    relative p-4 rounded-lg border-2 transition-all duration-200
                                    ${unlocked
                                        ? 'hover:scale-105 cursor-pointer'
                                        : 'opacity-50 cursor-not-allowed'}
                                `}
                                style={{
                                    backgroundColor: COLORS.bgSecondary,
                                    borderColor: unlocked
                                        ? progress?.stars
                                            ? '#22c55e'
                                            : COLORS.crane
                                        : '#475569',
                                }}
                            >
                                {!unlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                        <span className="text-2xl">🔒</span>
                                    </div>
                                )}
                                <div className="text-2xl font-bold text-white">
                                    {level.id}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                    {level.name}
                                </div>
                                <div className="mt-2">
                                    {renderStars(progress?.stars ?? 0)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
