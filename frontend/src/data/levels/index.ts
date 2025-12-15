// Level data index - exports all levels

import level01 from './level-01';
import level02 from './level-02';
import level03 from './level-03';
import level04 from './level-04';
import level05 from './level-05';
import level06 from './level-06';
import level07 from './level-07';
import level08 from './level-08';
import level09 from './level-09';
import level10 from './level-10';
import type { LevelDefinition } from '../../types/level';

export const LEVELS: LevelDefinition[] = [
    level01,
    level02,
    level03,
    level04,
    level05,
    level06,
    level07,
    level08,
    level09,
    level10,
];

export const getLevelById = (id: string): LevelDefinition | undefined => {
    return LEVELS.find((level) => level.id === id);
};

export const getNextLevel = (currentId: string): LevelDefinition | undefined => {
    const currentIndex = LEVELS.findIndex((level) => level.id === currentId);
    if (currentIndex === -1 || currentIndex === LEVELS.length - 1) {
        return undefined;
    }
    return LEVELS[currentIndex + 1];
};

export const getTotalLevels = (): number => LEVELS.length;

export {
    level01,
    level02,
    level03,
    level04,
    level05,
    level06,
    level07,
    level08,
    level09,
    level10,
};
