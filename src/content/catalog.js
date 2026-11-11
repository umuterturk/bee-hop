export {DIRECTIONS,stepHex,legalMoves,selectableMoves,playMove,statusOf,verifyPath,solvePuzzle} from '../engine/rules.js';
export {LEVEL_SPECS,WAVE_NAMES,WAVE_SIZES} from './levelSpecs.js';
export {evaluatePuzzle} from '../engine/puzzleEvaluator.js';
export {generatePuzzle} from '../engine/generator.js';
import {GENERATED_LEVELS} from './levels.generated.js';

export const LEVELS=Object.freeze(GENERATED_LEVELS.map(level=>Object.freeze(level)));
