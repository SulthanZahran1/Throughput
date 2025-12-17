import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { TARGET_RUN_TIME } from '../../constants/config';

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const VictoryScreen = () => {
    const runTime = useGameStore(state => state.runTime);
    const ordersCompleted = useGameStore(state => state.ordersCompleted);
    const robots = useGameStore(state => state.robots);
    const level = useGameStore(state => state.level);
    const failedOrders = useGameStore(state => state.failedOrders);
    const restart = useGameStore(state => state.restart);

    return (
        <motion.div
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                className="text-center space-y-4 sm:space-y-6 p-4 sm:p-8 bg-gradient-to-b from-amber-900/50 to-green-900/50 rounded-2xl border border-amber-500/50 max-w-md w-full"
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
            >
                {/* Victory Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <h1 className="text-3xl sm:text-5xl font-bold text-amber-400 mb-1 sm:mb-2">
                        🎉 SHIFT COMPLETE! 🎉
                    </h1>
                    <p className="text-green-400 text-base sm:text-xl">You survived the warehouse!</p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    className="grid grid-cols-2 gap-2 sm:gap-4 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <StatCard label="Run Time" value={formatTime(runTime)} icon="⏱️" />
                    <StatCard label="Target Time" value={formatTime(TARGET_RUN_TIME)} icon="🎯" />
                    <StatCard label="Orders" value={ordersCompleted.toString()} icon="📦" />
                    <StatCard label="Failed" value={failedOrders.toString()} icon="❌" />
                    <StatCard label="Robots" value={robots.length.toString()} icon="🤖" />
                    <StatCard label="Level" value={level.toString()} icon="⬆️" />
                </motion.div>

                {/* Play Again Button */}
                <motion.button
                    onClick={restart}
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-amber-500 to-green-500 text-black font-bold rounded-lg text-base sm:text-lg hover:from-amber-400 hover:to-green-400 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Play Again
                </motion.button>
            </motion.div>
        </motion.div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    icon: string;
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
    <div className="bg-black/40 rounded-lg p-2 sm:p-3 border border-gray-700">
        <div className="text-gray-400 text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2">
            <span>{icon}</span>
            <span>{label}</span>
        </div>
        <div className="text-white text-lg sm:text-2xl font-bold">{value}</div>
    </div>
);
