export interface Point {
    x: number;
    y: number;
}

export interface RouteOptions {
    hardObstacles?: Set<string>;
    softObstacles?: Set<string>;
    gridWidth: number;
    gridHeight: number;
    pickupRadius?: number;
}

export interface RouteTelemetry {
    session_id: string;
    timestamp: number;
    algorithm: string;
    start_pos: [number, number];
    target_pos: [number, number];
    nodes_visited: number;
    execution_time_ms: number;
    path_length: number;
    success: boolean;
}

export interface RouteResult {
    path: Point[] | null;
    telemetry: Omit<RouteTelemetry, 'session_id' | 'timestamp' | 'start_pos' | 'target_pos' | 'algorithm'>;
}

export interface IRouteFinder {
    name: string;
    findPath(start: Point, target: Point, options: RouteOptions): RouteResult;
}

class TelemetryStore {
    private metrics: RouteTelemetry[] = [];
    private sessionId: string = `session-${Math.random().toString(36).substr(2, 9)}`;

    add(metric: Omit<RouteTelemetry, 'session_id' | 'timestamp'>) {
        const fullMetric: RouteTelemetry = {
            ...metric,
            session_id: this.sessionId,
            timestamp: Date.now(),
        };
        this.metrics.push(fullMetric);

        // If we have enough metrics, flush to server
        if (this.metrics.length >= 5) {
            this.flush();
        }
    }

    async flush() {
        if (this.metrics.length === 0) return;

        const toFlush = [...this.metrics];
        this.metrics = [];

        try {
            if (typeof fetch === 'undefined') {
                // Skip if fetch is not available (e.g. old Node environment)
                return;
            }
            await Promise.all(toFlush.map(metric =>
                fetch('http://localhost:3001/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(metric),
                })
            ));
        } catch (error) {
            console.error('Failed to flush telemetry:', error);
            // Re-add to queue if failed? For now just drop or wait
        }
    }
}

export const telemetryStore = new TelemetryStore();

class RoutefindingPortal {
    private registry: Map<string, IRouteFinder> = new Map();
    private activeAlgorithm: string = 'astar';

    register(finder: IRouteFinder) {
        console.log(`[Portal] Registering algorithm: ${finder.name}`);
        this.registry.set(finder.name, finder);
    }

    setActiveAlgorithm(name: string) {
        if (this.registry.has(name)) {
            this.activeAlgorithm = name;
        }
    }

    findPath(start: Point, target: Point, options: RouteOptions): Point[] | null {
        const finder = this.registry.get(this.activeAlgorithm);
        if (!finder) {
            console.error(`[Portal] Error: Routefinder ${this.activeAlgorithm} not found! (Available: ${Array.from(this.registry.keys()).join(', ')})`);
            return null;
        }

        const result = finder.findPath(start, target, options);

        telemetryStore.add({
            algorithm: finder.name,
            start_pos: [start.x, start.y],
            target_pos: [target.x, target.y],
            ...result.telemetry,
        });

        return result.path;
    }
}

export const routefindingPortal = new RoutefindingPortal();
