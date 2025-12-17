import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameLoop = (active: boolean = true) => {
    const tick = useGameStore(state => state.tick);
    const requestRef = useRef<number | null>(null);
    const previousTimeRef = useRef<number | undefined>(undefined);

    const animate = (time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = time - previousTimeRef.current;
            // Cap delta time to avoid huge jumps if tab is inactive
            const cappedDelta = Math.min(deltaTime, 100);
            tick(cappedDelta);
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (active) {
            requestRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
};
