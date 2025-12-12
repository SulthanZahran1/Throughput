import { useEffect } from 'react';
import { Grid } from '../game/Grid';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { COLORS } from '../../constants/colors';

export function GameScreen() {
    const initializeGrid = useGameStore((state) => state.initializeGrid);
    const moveCraneTo = useGameStore((state) => state.moveCraneTo);
    const grid = useGameStore((state) => state.grid);
    const crane = useGameStore((state) => state.crane);
    const setScreen = useUIStore((state) => state.setScreen);

    // Initialize a test grid on mount
    useEffect(() => {
        initializeGrid(8, 8, { x: 0, y: 7 });
    }, [initializeGrid]);

    const handleSlotClick = (x: number, y: number) => {
        moveCraneTo(x, y);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="flex items-center justify-between w-full max-w-2xl mb-6">
                <button
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                    onClick={() => setScreen('main_menu')}
                >
                    ← Back
                </button>
                <h1
                    className="text-2xl font-bold"
                    style={{ color: COLORS.crane }}
                >
                    THROUGHPUT
                </h1>
                <div className="w-20" /> {/* Spacer for alignment */}
            </div>

            {/* Game Grid */}
            <div className="mb-6">
                <Grid cellSize={48} onSlotClick={handleSlotClick} />
            </div>

            {/* Info Panel */}
            <div className="flex gap-8 text-sm text-slate-400">
                <div>
                    Grid: {grid?.width}×{grid?.height}
                </div>
                <div>
                    Crane: ({crane?.x}, {crane?.y})
                </div>
                <div>
                    State: <span className="text-white">{crane?.state}</span>
                </div>
            </div>

            {/* Instructions */}
            <p className="mt-8 text-slate-500 text-sm">
                Click any cell to move the crane
            </p>
        </div>
    );
}
