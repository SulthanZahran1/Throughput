import type { IRouteFinder, Point, RouteOptions, RouteResult } from './routefinding';
import { routefindingPortal } from './routefinding';

interface Node extends Point {
    g: number; // Cost from start
    h: number; // Heuristic cost to end
    f: number; // Total cost (g + h)
    parent: Node | null;
}

/**
 * Simple Min-Heap Priority Queue for A* nodes
 */
class PriorityQueue<T> {
    private heap: { priority: number; item: T }[] = [];

    push(item: T, priority: number) {
        this.heap.push({ priority, item });
        this.bubbleUp();
    }

    pop(): T | undefined {
        if (this.size() === 0) return undefined;
        const top = this.heap[0].item;
        const last = this.heap.pop()!;
        if (this.size() > 0) {
            this.heap[0] = last;
            this.bubbleDown();
        }
        return top;
    }

    size(): number {
        return this.heap.length;
    }

    private bubbleUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    private bubbleDown() {
        let index = 0;
        while (true) {
            let smallest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;

            if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
                smallest = left;
            }
            if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
                smallest = right;
            }
            if (smallest === index) break;
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}

export class AStarRouteFinder implements IRouteFinder {
    name = 'astar';

    findPath(start: Point, target: Point, options: RouteOptions): RouteResult {
        const startTime = performance.now();
        let nodesVisited = 0;

        const {
            hardObstacles = new Set(),
            softObstacles = new Set(),
            gridWidth,
            gridHeight
        } = options;

        // If start is target, return current point
        if (start.x === target.x && start.y === target.y) {
            return {
                path: [start],
                telemetry: {
                    nodes_visited: 0,
                    execution_time_ms: performance.now() - startTime,
                    path_length: 1,
                    success: true
                }
            };
        }

        const openQueue = new PriorityQueue<Node>();
        const openMap = new Map<string, Node>();
        const closedList = new Set<string>();

        const startNode: Node = {
            ...start,
            g: 0,
            h: Math.abs(Math.round(target.x) - start.x) + Math.abs(Math.round(target.y) - start.y),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;

        openQueue.push(startNode, startNode.f);
        openMap.set(`${startNode.x},${startNode.y}`, startNode);

        while (openQueue.size() > 0) {
            const currentNode = openQueue.pop()!;
            const currentKey = `${currentNode.x},${currentNode.y}`;
            nodesVisited++;

            // If we already found a better path to this node, skip it
            const mappedNode = openMap.get(currentKey);
            if (mappedNode && mappedNode.g < currentNode.g) {
                continue;
            }

            // Found the target!
            // Robustness: Round goal coordinates to handle fractional targets (conveyors)
            if (currentNode.x === Math.round(target.x) && currentNode.y === Math.round(target.y)) {
                const path: Point[] = [];
                let temp: Node | null = currentNode;
                while (temp !== null) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                const finalPath = path.reverse();
                return {
                    path: finalPath,
                    telemetry: {
                        nodes_visited: nodesVisited,
                        execution_time_ms: performance.now() - startTime,
                        path_length: finalPath.length,
                        success: true
                    }
                };
            }

            openMap.delete(currentKey);
            closedList.add(currentKey);

            // Check neighbors (4-way cardinal movement)
            const neighbors = [
                { x: currentNode.x + 1, y: currentNode.y },
                { x: currentNode.x - 1, y: currentNode.y },
                { x: currentNode.x, y: currentNode.y + 1 },
                { x: currentNode.x, y: currentNode.y - 1 }
            ];

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                // Valid bounds?
                if (neighbor.x < 0 || neighbor.x >= gridWidth || neighbor.y < 0 || neighbor.y >= gridHeight) {
                    continue;
                }

                // Hard Obstacles? (Allow target cell even if hard-blocked, e.g. robot standing on port)
                const isTarget = neighbor.x === target.x && neighbor.y === target.y;
                if (hardObstacles.has(neighborKey) && !isTarget) {
                    continue;
                }

                // In closed list?
                if (closedList.has(neighborKey)) {
                    continue;
                }

                // Weighted cost: 1 for empty, 5 for soft obstacles (like other robots)
                // This encourages robots to path around each other, but path THROUGH if blocked.
                const traversalCost = softObstacles.has(neighborKey) ? 5 : 1;
                const gScore = currentNode.g + traversalCost;

                const existingNode = openMap.get(neighborKey);

                if (!existingNode || gScore < existingNode.g) {
                    const h = Math.abs(Math.round(target.x) - neighbor.x) + Math.abs(Math.round(target.y) - neighbor.y);
                    const newNode: Node = {
                        ...neighbor,
                        g: gScore,
                        h,
                        f: gScore + h,
                        parent: currentNode
                    };
                    openMap.set(neighborKey, newNode);
                    openQueue.push(newNode, newNode.f);
                }
            }
        }

        return {
            path: null,
            telemetry: {
                nodes_visited: nodesVisited,
                execution_time_ms: performance.now() - startTime,
                path_length: 0,
                success: false
            }
        };
    }
}

// Register with the portal
routefindingPortal.register(new AStarRouteFinder());

/**
 * Legacy export for backward compatibility during transition
 * WARNING: This now requires explicit width/height or will fail
 */
export const findPath = (
    start: Point,
    target: Point,
    hardObstacles: Set<string> = new Set(),
    softObstacles: Set<string> = new Set(),
    gridWidth: number,
    gridHeight: number
): Point[] | null => {
    return routefindingPortal.findPath(start, target, {
        hardObstacles,
        softObstacles,
        gridWidth,
        gridHeight
    });
};

