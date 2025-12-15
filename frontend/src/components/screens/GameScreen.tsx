import { useEffect, useState } from 'react';
import { Grid } from '../game/Grid';
import { ZoneEditor } from '../editor/ZoneEditor';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useProgressStore } from '../../store/progressStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { COLORS, ITEM_COLORS } from '../../constants/colors';
import { MAX_FAILED_ORDERS } from '../../constants/config';

export function GameScreen() {
    const resetGame = useGameStore((state) => state.resetGame);
    const getShiftResult = useGameStore((state) => state.getShiftResult);
    const setPaused = useGameStore((state) => state.setPaused);
    const completeLevel = useProgressStore((state) => state.completeLevel);

    const grid = useGameStore((state) => state.grid);
    const crane = useGameStore((state) => state.crane);
    const orders = useGameStore((state) => state.orders);
    const stats = useGameStore((state) => state.stats);
    const isPaused = useGameStore((state) => state.isPaused);
    const realTime = useGameStore((state) => state.realTime);
    const shiftTime = useGameStore((state) => state.shiftTime);
    const currentLevel = useGameStore((state) => state.currentLevel);

    const setScreen = useUIStore((state) => state.setScreen);
    const [showZoneEditor, setShowZoneEditor] = useState(false);
    const [shiftEnded, setShiftEnded] = useState(false);

    // Start game loop
    useGameLoop();

    // Detect end of shift
    useEffect(() => {
        if (shiftEnded) return;

        const isLose = stats.ordersFailed >= MAX_FAILED_ORDERS;
        const isWin = shiftTime <= 0 && realTime > 0;

        if (isWin || isLose) {
            setShiftEnded(true);
            setPaused(true);

            const result = getShiftResult();
            if (result) {
                completeLevel(result);
                // Small delay before navigating to show the final state
                setTimeout(() => {
                    setScreen('shift_summary');
                }, 500);
            }
        }
    }, [shiftTime, stats.ordersFailed, shiftEnded, getShiftResult, completeLevel, setScreen, setPaused, realTime]);

    const handleSlotClick = (_x: number, _y: number) => {
        if (!crane || !grid || shiftEnded) {
            return;
        }

        // Auto-resume if paused
        if (isPaused) {
            setPaused(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="flex items-center justify-between w-full max-w-4xl mb-6">
                <button
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                    onClick={() => {
                        resetGame();
                        setScreen('level_select');
                    }}
                >
                    ← Back
                </button>
                <div className="text-center">
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: COLORS.crane }}
                    >
                        {currentLevel ? currentLevel.name : 'THROUGHPUT'}
                    </h1>
                    <div className="text-sm text-slate-400 font-mono">
                        Time: {Math.floor(shiftTime / 60)}:{String(Math.floor(shiftTime % 60)).padStart(2, '0')}
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                        onClick={() => setPaused(!isPaused)}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        className={`px-4 py-2 rounded text-white ${showZoneEditor ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                        onClick={() => setShowZoneEditor(!showZoneEditor)}
                    >
                        Zones
                    </button>
                </div>
            </div>

            {showZoneEditor && <ZoneEditor />}

            <div className="flex gap-8 items-start">
                {/* Left Panel: Orders */}
                <div className="w-64 bg-slate-800 p-4 rounded-lg min-h-[400px]">
                    <h2 className="text-lg font-bold mb-4 text-slate-300">Orders</h2>
                    <div className="flex flex-col gap-2">
                        {orders.filter(o => o.status === 'pending').map(order => (
                            <div key={order.id} className="bg-slate-700 p-3 rounded border-l-4" style={{ borderColor: ITEM_COLORS[order.itemType] }}>
                                <div className="flex justify-between text-white">
                                    <span className="capitalize">{order.itemType}</span>
                                    <span className="font-mono">{(order.deadline - realTime).toFixed(1)}s</span>
                                </div>
                            </div>
                        ))}
                        {orders.filter(o => o.status === 'pending').length === 0 && (
                            <div className="text-slate-500 text-sm italic">No active orders</div>
                        )}
                    </div>
                </div>

                {/* Center: Grid */}
                <div className="flex flex-col items-center">
                    <div className="mb-6">
                        <Grid cellSize={48} onSlotClick={handleSlotClick} />
                    </div>

                    {/* Info Panel */}
                    <div className="flex gap-8 text-sm text-slate-400 bg-slate-800 px-6 py-3 rounded-full">
                        <div>
                            Time: <span className="text-white font-mono">{realTime.toFixed(1)}s</span>
                        </div>
                        <div>
                            Crane: <span className="text-white">{crane?.state}</span>
                            {crane?.busyTimeRemaining && crane.busyTimeRemaining > 0 ? (
                                <span className="ml-2 text-xs">({crane.busyTimeRemaining.toFixed(1)}s)</span>
                            ) : null}
                        </div>
                        <div>
                            Carrying: <span className="text-white capitalize">{crane?.carrying ? crane.carrying.type : 'None'}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Stats & Controls */}
                <div className="w-64 bg-slate-800 p-4 rounded-lg min-h-[400px] flex flex-col gap-6">
                    <div>
                        <h2 className="text-lg font-bold mb-4 text-slate-300">Stats</h2>
                        <div className="space-y-2 text-white">
                            <div className="flex justify-between">
                                <span>Completed</span>
                                <span className="text-green-400">{stats.ordersCompleted}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Failed</span>
                                <span className="text-red-400">{stats.ordersFailed}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold mb-4 text-slate-300">Controls</h2>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Retrieval Mode</label>
                            <div className="flex flex-col gap-1">
                                {[
                                    { id: 'fifo', label: 'FIFO', desc: 'Oldest First' },
                                    { id: 'deadline', label: 'Deadline', desc: 'Urgent First' },
                                    { id: 'nearest', label: 'Nearest', desc: 'Closest Item' },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => {
                                            useGameStore.getState().setRetrievalMode(mode.id as any);
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${useGameStore((state) => state.retrievalMode) === mode.id
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="font-medium">{mode.label}</span>
                                        <span className={`text-xs ${useGameStore((state) => state.retrievalMode) === mode.id
                                            ? 'text-blue-200'
                                            : 'text-slate-500'
                                            }`}>{mode.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Crane Mode</label>
                            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                                <button
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${useGameStore((state) => state.craneMode) === 'single'
                                        ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    onClick={() => {
                                        useGameStore.getState().setCraneMode('single');
                                    }}
                                >
                                    Single
                                </button>
                                <button
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${useGameStore((state) => state.craneMode) === 'dual'
                                        ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    onClick={() => {
                                        useGameStore.getState().setCraneMode('dual');
                                    }}
                                >
                                    Dual
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] text-slate-500 text-center">
                                {useGameStore((state) => state.craneMode) === 'single'
                                    ? 'Standard store & retrieve cycles'
                                    : 'Combined trips for efficiency'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            {/* Instructions */}
            <div className="mt-8 text-slate-500 text-sm max-w-xl text-center bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <h3 className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-xs">How to Play</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left">
                    <div>
                        <span className="text-blue-400 font-bold">1.</span> Click <b className="text-slate-300">+ Order</b> to get work.
                    </div>
                    <div>
                        <span className="text-blue-400 font-bold">2.</span> Click <b className="text-yellow-400">I/O Port</b> to pick up.
                    </div>
                    <div>
                        <span className="text-blue-400 font-bold">3.</span> Click <b className="text-slate-300">Empty Slot</b> to store.
                    </div>
                    <div>
                        <span className="text-blue-400 font-bold">4.</span> Click <b className="text-slate-300">Item</b> to retrieve.
                    </div>
                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-700/50 text-center text-xs text-slate-400">
                        <span className="text-blue-400">Tip:</span> Use <b>Zones</b> to automate storage and retrieval!
                    </div>
                </div>
            </div>
        </div>
    );
}
