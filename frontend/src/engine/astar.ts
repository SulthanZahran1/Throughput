import { GRID_SIZE } from '../constants/config';

export interface Point {
    x: number;
    y: number;
}

interface Node extends Point {
    g: number; // Cost from start
    h: number; // Heuristic cost to end
    f: number; // Total cost (g + h)
    parent: Node | null;
}

/**
 * A* Pathfinding algorithm
 * Returns an array of points from start to target, or null if no path found.
 */
export const findPath = (
    start: Point,
    target: Point,
    occupiedCells: Set<string>,
    gridWidth: number = GRID_SIZE,
    gridHeight: number = GRID_SIZE
): Point[] | null => {
    // If start is target, return current point
    if (start.x === target.x && start.y === target.y) {
        return [start];
    }

    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    const startNode: Node = {
        ...start,
        g: 0,
        h: Math.abs(target.x - start.x) + Math.abs(target.y - start.y),
        f: 0,
        parent: null
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
        // Find node with lowest f cost
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[currentIndex].f) {
                currentIndex = i;
            }
        }

        const currentNode = openList[currentIndex];
        const currentKey = `${currentNode.x},${currentNode.y}`;

        // Found the target!
        if (currentNode.x === target.x && currentNode.y === target.y) {
            const path: Point[] = [];
            let temp: Node | null = currentNode;
            while (temp !== null) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        // Remove from open, add to closed
        openList.splice(currentIndex, 1);
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

            // Occupied? (Allow target cell to be occupied since we're trying to reach it)
            const isTarget = neighbor.x === target.x && neighbor.y === target.y;
            if (occupiedCells.has(neighborKey) && !isTarget) {
                continue;
            }

            // In closed list?
            if (closedList.has(neighborKey)) {
                continue;
            }

            const gScore = currentNode.g + 1;
            let neighborNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

            if (!neighborNode) {
                neighborNode = {
                    ...neighbor,
                    g: gScore,
                    h: Math.abs(target.x - neighbor.x) + Math.abs(target.y - neighbor.y),
                    f: 0,
                    parent: currentNode
                };
                neighborNode.f = neighborNode.g + neighborNode.h;
                openList.push(neighborNode);
            } else if (gScore < neighborNode.g) {
                // Better path found
                neighborNode.g = gScore;
                neighborNode.f = neighborNode.g + neighborNode.h;
                neighborNode.parent = currentNode;
            }
        }
    }

    return null; // No path found
};
