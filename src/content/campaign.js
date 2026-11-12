/** Wave grants from the design doc. Tools are optional assistance on the
 * certified pure puzzles: every published level still clears with jumps alone.
 * Ability-required layouts are a later regeneration gate, not these fixtures.
 *
 * Undo is unlimited on levels 1–5 and three rewinds from level 6.
 * Waggle Dance is free through level 10, then two reveals.
 * Tunnel (16–20), Pollen Seed (21–25) and Worker (26–30) arrive one per wave.
 * Pollen stays once it arrives, including the Worker wave.
 * Levels 31–35 offer Tunnel and Pollen. Levels 36–40 offer all three. */
import {hexDistance} from '../engine/abilities.js';

export function inventoryFor(level){
  const id=level.id;
  return {
    undo:id<=5?null:3,
    dance:id<=10?null:2,
    tunnel:(id>=16&&id<=20)||id>=31?1:0,
    seed:id>=21?1:0,
    worker:(id>=26&&id<=30)||id>=36?1:0
  };
}
/** One empty hive, the empty hex farthest from the bee. Stable across reloads. */
export function hiveCell(level){
  const taken=new Set([level.bee,...level.pollen]);
  let best=-1,bestDistance=-1;
  for(let cell=0;cell<level.width*level.height;cell++){
    if(taken.has(cell))continue;
    const distance=hexDistance(level.bee,cell,level.width);
    if(distance>bestDistance){best=cell;bestDistance=distance;}
  }
  return best;
}
export function lessonFor(level){
  if(level.id===1)return 'Tap the green hex.';
  if(level.id<=5)return 'Land on any green hex past the flower.';
  if(level.id===16)return 'Tunnel moves your bee. It does not take pollen.';
  if(level.id===21)return 'Pollen plants a flower. You have to collect it too.';
  if(level.id===26)return 'The hive can call a second bee. Pollen still plants a flower. You can also clear this alone.';
  if(level.id===31)return 'Tunnel and Pollen are both here if you want them.';
  if(level.id===36)return 'Every tool is here. This field still clears without them.';
  if(level.boss)return 'Boss field. Choose the landing, not just the flower.';
  return null;
}
