import { useEffect } from 'react';
import { Grid } from '../game/Grid';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { COLORS, ITEM_COLORS } from '../../constants/colors';

export function GameScreen() {
    const initializeGrid = useGameStore((state) => state.initializeGrid);
    const moveCraneTo = useGameStore((state) => state.moveCraneTo);
    const pickupFromIO = useGameStore((state) => state.pickupFromIO);
    const storeAt = useGameStore((state) => state.storeAt);
    const retrieveFrom = useGameStore((state) => state.retrieveFrom);
    const deliverToIO = useGameStore((state) => state.deliverToIO);
    const generateOrder = useGameStore((state) => state.generateOrder);
    const setPaused = useGameStore((state) => state.setPaused);

    const grid = useGameStore((state) => state.grid);
    const crane = useGameStore((state) => state.crane);
    const orders = useGameStore((state) => state.orders);
    const stats = useGameStore((state) => state.stats);
    const isPaused = useGameStore((state) => state.isPaused);
    const realTime = useGameStore((state) => state.realTime);

    const setScreen = useUIStore((state) => state.setScreen);

    // Start game loop
    useGameLoop();

    // Initialize a test grid on mount
    useEffect(() => {
        initializeGrid(8, 8, { x: 0, y: 7 });
        // Start paused? Store default is paused.
    }, [initializeGrid]);

    const handleSlotClick = (x: number, y: number) => {
        if (!crane || !grid) return;

        // If not at target, move there
        if (crane.x !== x || crane.y !== y) {
            moveCraneTo(x, y);
            return;
        }

        // If at target, perform action
        const isIOPort = x === grid.ioPort.x && y === grid.ioPort.y;

        if (isIOPort) {
            if (crane.carrying) {
                deliverToIO();
            } else {
                pickupFromIO();
            }
        } else {
            if (crane.carrying) {
                storeAt(x, y);
            } else {
                retrieveFrom(x, y);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="flex items-center justify-between w-full max-w-4xl mb-6">
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
                <div className="flex gap-4">
                    <button
                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                        onClick={() => setPaused(!isPaused)}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                        onClick={() => generateOrder()}
                    >
                        + Order
                    </button>
                </div>
            </div>

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

                {/* Right Panel: Stats */}
                <div className="w-64 bg-slate-800 p-4 rounded-lg min-h-[400px]">
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
            </div>

            {/* Instructions */}
            <p className="mt-8 text-slate-500 text-sm max-w-xl text-center">
                1. Click <b>+ Order</b> to generate demand.<br />
                2. Click <b>I/O Port</b> (yellow) to pick up items.<br />
                3. Click <b>Empty Slot</b> to store items.<br />
                4. Click <b>Occupied Slot</b> to retrieve items.<br />
                5. Click <b>I/O Port</b> to deliver matching items.
            </p>
        </div>
    );
}
