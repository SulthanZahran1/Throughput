import { useGameStore } from '../../store/gameStore';
import type { Upgrade, UpgradeId } from '../../types/game';

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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-4 sm:p-8 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 text-center mb-1 sm:mb-2">
                    Level Up!
                </h2>
                <p className="text-gray-400 text-center text-sm sm:text-base mb-4 sm:mb-6">
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
            </div>
        </div>
    );
};
