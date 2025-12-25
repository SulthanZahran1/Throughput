import { useGameStore } from '../../store/gameStore';
import type { Upgrade, UpgradeId } from '../../types/game';
import { motion, AnimatePresence } from 'framer-motion';

interface UpgradeCardProps {
    upgrade: Upgrade;
    onSelect: (id: UpgradeId) => void;
}

const UpgradeCard = ({ upgrade, onSelect }: UpgradeCardProps) => {
    return (
        <button
            onClick={() => onSelect(upgrade.id)}
            className="flex flex-col items-center p-3 sm:p-6 bg-gray-800 rounded-xl border-2 border-gray-600 hover:border-yellow-400 hover:bg-gray-700 transition-all duration-200 cursor-pointer min-w-[120px] sm:min-w-[180px]"
        >
            <span className="text-2xl sm:text-4xl mb-2 sm:mb-3">{upgrade.icon}</span>
            <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2 text-center">{upgrade.name}</h3>
            <p className="text-xs sm:text-sm text-gray-300 text-center">{upgrade.description}</p>
            {upgrade.stackable && (
                <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-green-400">Stackable</span>
            )}
        </button>
    );
};

export const UpgradeModal = () => {
    const isSelectingUpgrade = useGameStore(state => state.isSelectingUpgrade);
    const pendingUpgrades = useGameStore(state => state.pendingUpgrades);
    const level = useGameStore(state => state.level);
    const selectUpgrade = useGameStore(state => state.selectUpgrade);

    if (!isSelectingUpgrade || pendingUpgrades.length === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            {isSelectingUpgrade && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-gray-900 p-4 sm:p-8 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="absolute -top-12 left-0 right-0 text-center"
                        >
                            <h1 className="text-4xl sm:text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] italic uppercase tracking-tighter">
                                Level Up!
                            </h1>
                        </motion.div>

                        <p className="text-gray-400 text-center text-sm sm:text-base mb-4 sm:mb-6 mt-4">
                            You reached level {level}. Choose an upgrade:
                        </p>

                        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                            {pendingUpgrades.map(upgrade => (
                                <UpgradeCard
                                    key={upgrade.id}
                                    upgrade={upgrade}
                                    onSelect={selectUpgrade}
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
