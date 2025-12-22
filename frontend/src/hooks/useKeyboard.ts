import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GRID_SIZE } from '../constants/config';

export const useKeyboard = () => {
    const player = useGameStore(state => state.player);
    const setPlayerTarget = useGameStore(state => state.setPlayerTarget);
    const isGameOver = useGameStore(state => state.isGameOver);
    const isSelectingUpgrade = useGameStore(state => state.isSelectingUpgrade);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isGameOver || isSelectingUpgrade) return;

            let targetX = player.targetX ?? player.x;
            let targetY = player.targetY ?? player.y;

            switch (e.key) {
                case 'w':
                case 'ArrowUp':
                    targetY = Math.max(0, player.y - 1);
                    targetX = player.x;
                    break;
                case 's':
                case 'ArrowDown':
                    targetY = Math.min(GRID_SIZE - 1, player.y + 1);
                    targetX = player.x;
                    break;
                case 'a':
                case 'ArrowLeft':
                    targetX = Math.max(0, player.x - 1);
                    targetY = player.y;
                    break;
                case 'd':
                case 'ArrowRight':
                    targetX = Math.min(GRID_SIZE - 1, player.x + 1);
                    targetY = player.y;
                    break;
                default:
                    return; // Don't set target for other keys
            }

            setPlayerTarget(targetX, targetY);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player.x, player.y, player.targetX, player.targetY, setPlayerTarget, isGameOver, isSelectingUpgrade]);
};
