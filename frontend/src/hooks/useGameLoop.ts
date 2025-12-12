import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameLoop() {
    const tick = useGameStore((state) => state.tick);
    const isPaused = useGameStore((state) => state.isPaused);
    const lastTimeRef = useRef<number>(0);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const animate = (time: number) => {
            if (lastTimeRef.current !== 0) {
                const dt = (time - lastTimeRef.current) / 1000;
                // Cap dt to avoid huge jumps if tab inactive (max 100ms)
                tick(Math.min(dt, 0.1));
            }
            lastTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };

        if (!isPaused) {
            lastTimeRef.current = 0; // Reset on resume so first frame doesn't have huge dt
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = 0;
        }

        return () => cancelAnimationFrame(requestRef.current);
    }, [isPaused, tick]);
}
