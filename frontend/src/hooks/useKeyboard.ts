import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useKeyboard = () => {
    const movePlayer = useGameStore(state => state.movePlayer);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'w':
                case 'ArrowUp':
                    movePlayer(0, -1);
                    break;
                case 's':
                case 'ArrowDown':
                    movePlayer(0, 1);
                    break;
                case 'a':
                case 'ArrowLeft':
                    movePlayer(-1, 0);
                    break;
                case 'd':
                case 'ArrowRight':
                    movePlayer(1, 0);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [movePlayer]);
};

