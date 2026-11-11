import {lessonFor} from '../content/campaign.js';
import {statusOf,step} from '../engine/abilities.js';

/** Landing cells whose every listed jump leaves the board stuck. */
export function deadEndCells(board,jumps){
  const byLanding=new Map();
  for(const move of jumps){
    const list=byLanding.get(move.to);
    if(list)list.push(move);
    else byLanding.set(move.to,[move]);
  }
  const dead=new Set();
  for(const [to,moves] of byLanding){
    if(moves.every(move=>statusOf(step(board,move))==='stuck'))dead.add(to);
  }
  return dead;
}

export function earnedBadges(round,level){
  const badges=[];
  if(!round.usedTool)badges.push({id:'pure',name:'Pure Flight'});
  if(!round.usedUndo)badges.push({id:'clean',name:'Clean Wings'});
  if(level.boss)badges.push({id:'boss',name:'Hive Master'});
  return badges;
}
export function hintCopy(hint){
  if(!hint)return '';
  if(hint.outcome==='looking')return 'Looking for a route that clears the field.';
  if(hint.outcome==='none')return 'No winning route from here. Undo or restart.';
  if(hint.outcome==='unknown')return 'This field is too tangled for a hint. Try Undo.';
  const step=hint.steps[hint.layer]||hint.steps[0];
  const later=hint.layer>0;
  if(step?.type==='tunnel')return later?'Then burrow to the marked hex.':'Burrow to the marked hex. That route clears the field.';
  if(step?.type==='seed')return later?'Then plant on the marked hex.':'Plant on the marked hex. That route clears the field.';
  if(step?.type==='summon')return later?'Then call the worker at the hive.':'Call the worker at the marked hive. That route clears the field.';
  return later?'After that, this landing still clears the field.':'This landing is on a route that clears the field.';
}
/** Which booster to pulse when the selected bee has no hop. */
export function boosterCallout({status,mode,jumpCount,otherJumps=0,charges={},undoAvailable=false}){
  if(status!=='playing'||mode||jumpCount>0||otherJumps>0)return null;
  if(charges.seed>0)return 'seed';
  if(charges.tunnel>0)return 'tunnel';
  if(charges.worker>0)return 'summon';
  if(undoAvailable)return 'undo';
  return 'hint';
}

/** One honey hex for every cell. Marks show the bee, flower, hive, and stone traps. */
export function hexTile({
  landing=false,dead=false,pollen=false,hive=false,
  tool=false,mode=null,settledBee=false,worker=false
}){
  const tile='hexHoney';
  let mark=null;
  if(settledBee)mark=worker?'beeWorker':'bee';
  else if(tool&&mode==='seed')mark='mango';
  else if(pollen)mark='flower';
  else if(landing&&dead)mark='stoneMoss';
  else if(hive)mark='crown';
  return {tile,mark};
}

export function boardNote({status,hint,mode,filtered,level,round,jumpCount=null,otherJumps=0}){
  if(status==='won')return 'Every flower is in the jar.';
  if(hint)return hintCopy(hint);
  if(mode==='tunnel')return 'Tap a glowing hex to burrow. It collects nothing.';
  if(mode==='seed')return 'Tap an empty hex to plant a flower you must collect.';
  if(mode==='summon')return 'Tap the hive to call a worker bee.';
  if(status==='stuck')return 'No jumps or tools left. Undo or restart.';
  if(jumpCount===0){
    if(otherJumps>0)return 'This bee has no hop. Tap the other bee.';
    const charges=round.charges||{};
    if(charges.seed>0)return 'No hops from here. Plant a flower, or undo.';
    if(charges.tunnel>0)return 'No hops from here. Burrow, or undo.';
    if(charges.worker>0)return 'No hops from here. Call a worker, or undo.';
    return 'No hops from here. Undo or restart.';
  }
  if(filtered)return 'Tap a green hex to land, or tap the bee to see every hop.';
  if(round.turns===0&&!round.usedUndo){
    const lesson=lessonFor(level);
    if(lesson)return lesson;
  }
  if(round.bees.length>1)return 'Tap a bee, then a green hex. Bees block each other.';
  return 'Tap a green hex to fly.';
}
export function pollenLeft(round){return round.pollen.length;}
export function jarFill(round){
  if(!round.goal)return 0;
  return Math.min(1,Math.max(0,(round.goal-round.pollen.length)/round.goal));
}
