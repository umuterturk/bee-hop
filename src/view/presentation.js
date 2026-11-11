import {lessonFor} from '../content/campaign.js';

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
export function boardNote({status,hint,mode,filtered,level,round}){
  if(status==='won')return 'Every flower is in the jar.';
  if(hint)return hintCopy(hint);
  if(mode==='tunnel')return 'Tap a wax hex to burrow. It collects nothing.';
  if(mode==='seed')return 'Tap an empty hex to plant a flower you must collect.';
  if(mode==='summon')return 'Tap the hive to call a worker bee.';
  if(status==='stuck')return 'No jumps or tools left. Undo or restart.';
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
