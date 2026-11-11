import {step} from '../engine/abilities.js';
import {hiveCell,inventoryFor} from '../content/campaign.js';

export function toBoard(round){
  return {
    width:round.width,height:round.height,bees:round.bees,pollen:round.pollen,
    charges:round.charges,hives:round.hives,blocked:round.blocked||[]
  };
}
function snapshot(round){
  return {
    bees:round.bees,
    pollen:round.pollen,
    charges:{...round.charges},
    goal:round.goal,
    lead:round.lead,
    usedTool:round.usedTool,
    turns:round.turns
  };
}
function nextLead(round,action){
  if((action.type==='jump'||action.type==='tunnel')&&action.bee===round.lead)return action.to;
  return round.lead;
}
export function newRound(level,grant=inventoryFor(level)){
  const hive=grant.worker?hiveCell(level):-1;
  return {
    width:level.width,
    height:level.height,
    bees:[level.bee],
    pollen:[...level.pollen].sort((a,b)=>a-b),
    charges:{tunnel:grant.tunnel,seed:grant.seed,worker:grant.worker},
    hives:hive>=0?[hive]:[],
    blocked:[],
    lead:level.bee,
    past:[],
    undoLeft:grant.undo,
    danceLeft:grant.dance,
    usedUndo:false,
    usedTool:false,
    turns:0,
    goal:level.pollen.length
  };
}
export function commit(round,action){
  const board=toBoard(round);
  const next=step(board,action);
  if(next===board)return round;
  return {
    ...round,
    bees:next.bees,
    pollen:next.pollen,
    charges:next.charges,
    goal:action.type==='seed'?round.goal+1:round.goal,
    lead:nextLead(round,action),
    past:[...round.past,snapshot(round)],
    usedTool:round.usedTool||action.type!=='jump',
    turns:round.turns+1,
    celebrated:false
  };
}
/** Rewinds one committed action. The rewind charge lives outside the snapshot,
 * so undoing a rewind does not refund it. */
export function undo(round){
  if(!round.past.length)return round;
  if(round.undoLeft!==null&&round.undoLeft<=0)return round;
  const prev=round.past[round.past.length-1];
  return {
    ...round,
    bees:prev.bees,
    pollen:prev.pollen,
    charges:prev.charges,
    goal:prev.goal,
    lead:prev.lead,
    usedTool:prev.usedTool,
    turns:prev.turns,
    past:round.past.slice(0,-1),
    undoLeft:round.undoLeft===null?null:round.undoLeft-1,
    usedUndo:true,
    celebrated:false
  };
}
export function spendDance(round){
  if(round.danceLeft!==null&&round.danceLeft<=0)return round;
  return {...round,danceLeft:round.danceLeft===null?null:round.danceLeft-1};
}
