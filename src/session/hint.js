import {solvePuzzle} from '../engine/rules.js';
import {solveAbilities} from '../engine/abilities.js';

function pureSteps(moves){
  return moves.map(move=>({type:'jump',bee:move.from,over:move.over,to:move.to}));
}
/** A hinted jump is taken from a complete winning sequence, so the copy can
 * promise a clear. A capped search stays "unknown", never "impossible". */
export function findHint(board,{maxStates=200000,abilityStates=80000}={}){
  const tools=board.charges.tunnel+board.charges.seed+board.charges.worker>0||board.bees.length>1;
  if(board.bees.length===1){
    const pure=solvePuzzle({width:board.width,height:board.height,bee:board.bees[0],pollen:board.pollen},{maxStates});
    if(pure.solvable&&!pure.truncated)return {outcome:'win',steps:pureSteps(pure.moves)};
    if(!tools)return {outcome:pure.truncated?'unknown':'none',steps:[]};
  }
  const solved=solveAbilities(board,{maxStates:abilityStates});
  if(solved.solvable)return {outcome:'win',steps:solved.actions};
  return {outcome:solved.truncated?'unknown':'none',steps:[]};
}
