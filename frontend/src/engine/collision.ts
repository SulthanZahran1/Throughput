import type { Robot } from '../types/game';
import { ROBOT_COLLISION_DISTANCE, ROBOT_COLLISION_SLOWDOWN } from '../constants/config';

/**
 * Calculate distance between two robots
 */
const getDistance = (robot1: Robot, robot2: Robot): number => {
    const dx = robot1.x - robot2.x;
    const dy = robot1.y - robot2.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Get speed slowdown multiplier for a robot based on proximity to other robots
 * Returns 1.0 if no collision, ROBOT_COLLISION_SLOWDOWN if another robot is nearby
 */
export const getRobotCollisionSlowdown = (robot: Robot, allRobots: Robot[]): number => {
    // Check if any other robot is within collision distance
    for (const other of allRobots) {
        if (other.id === robot.id) continue;

        const distance = getDistance(robot, other);
        if (distance < ROBOT_COLLISION_DISTANCE) {
            // Robot is too close, apply slowdown
            return ROBOT_COLLISION_SLOWDOWN;
        }
    }

    return 1.0; // No collision, full speed
};

/**
 * Check if a robot will collide with another at a target position
 */
export const willCollideAtPosition = (
    targetX: number,
    targetY: number,
    robotId: string,
    allRobots: Robot[]
): boolean => {
    for (const other of allRobots) {
        if (other.id === robotId) continue;

        const dx = targetX - other.x;
        const dy = targetY - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.5) {
            // Would be too close
            return true;
        }
    }

    return false;
};

