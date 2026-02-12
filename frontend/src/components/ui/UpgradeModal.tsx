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
            className="flex flex-col items-center p-2 sm:p-6 bg-gray-800/80 backdrop-blur-sm rounded-xl border-2 border-gray-600 hover:border-yellow-400 hover:bg-gray-700 transition-all duration-200 cursor-pointer min-w-[100px] sm:min-w-[180px] w-full sm:w-auto"
        >
            <span className="text-xl sm:text-4xl mb-1 sm:mb-3">{upgrade.icon}</span>
            <h3 className="text-xs sm:text-lg font-bold text-white mb-0.5 sm:mb-2 text-center leading-tight">{upgrade.name}</h3>
            <p className="text-[10px] sm:text-sm text-gray-300 text-center line-clamp-2 sm:line-clamp-none">{upgrade.description}</p>
            {upgrade.stackable && (
                <span className="mt-1 sm:mt-2 text-[8px] sm:text-xs text-green-400 font-medium">Stackable</span>
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
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 p-4 sm:p-8 rounded-2xl border border-gray-700 max-w-[min(95vw,1000px)] w-full my-auto shadow-[0_0_50px_rgba(250,204,21,0.1)] backdrop-blur-xl"
                    >
                        <div className="text-center mb-4 sm:mb-8">
                            <motion.h1
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-3xl sm:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] italic uppercase tracking-tighter"
                            >
                                Level Up!
                            </motion.h1>
                            <p className="text-gray-400 text-xs sm:text-base mt-2">
                                You reached level <span className="text-white font-bold">{level}</span>. Choose an upgrade:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-4 overflow-y-visible">
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
