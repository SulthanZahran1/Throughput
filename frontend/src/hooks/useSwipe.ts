import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const SWIPE_THRESHOLD = 30; // Minimum pixels to register a swipe

export const useSwipe = () => {
    const player = useGameStore(state => state.player);
    const gridSize = useGameStore(state => state.gridSize);
    const setPlayerTarget = useGameStore(state => state.setPlayerTarget);
    const isGameOver = useGameStore(state => state.isGameOver);
    const isSelectingUpgrade = useGameStore(state => state.isSelectingUpgrade);

    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (isGameOver || isSelectingUpgrade) return;
            if (!touchStartRef.current) return;
            if (e.changedTouches.length !== 1) return;

            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY,
            };

            const deltaX = touchEnd.x - touchStartRef.current.x;
            const deltaY = touchEnd.y - touchStartRef.current.y;

            // Check if swipe is long enough
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
                // Too short, not a swipe (might be a tap)
                touchStartRef.current = null;
                return;
            }

            let targetX = player.x;
            let targetY = player.y;

            // Determine swipe direction (horizontal or vertical dominant)
            if (absX > absY) {
                // Horizontal swipe
                if (deltaX > 0) {
                    // Swipe right
                    targetX = Math.min(gridSize - 1, player.x + 1);
                } else {
                    // Swipe left
                    targetX = Math.max(0, player.x - 1);
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    // Swipe down
                    targetY = Math.min(gridSize - 1, player.y + 1);
                } else {
                    // Swipe up
                    targetY = Math.max(0, player.y - 1);
                }
            }

            setPlayerTarget(targetX, targetY);
            touchStartRef.current = null;
        };

        const handleTouchCancel = () => {
            touchStartRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [player.x, player.y, setPlayerTarget, isGameOver, isSelectingUpgrade, gridSize]);
};

