import {lessonFor} from '../content/campaign.js';

const BURST_SPRITES=['sparkleLarge','sparkleMedium','sparkleSmall','sparkleMedium','sparkleSmall','sparkleLarge','sparkleSmall','sparkleMedium'];

/** Sparkle bits that burst from a collected flower. Positions stay distinct. */
export function collectBurst(scale=1,turnOffset=0){
  return BURST_SPRITES.map((sprite,index)=>{
    const turn=(Math.PI*2*index)/BURST_SPRITES.length+turnOffset;
    const reach=(index%2?48:34)*scale;
    return {
      sprite,
      dx:Math.round(Math.cos(turn)*reach),
      dy:Math.round(Math.sin(turn)*reach-8*scale),
      delay:index*0.02,
      spin:index%2?180:-200,
      size:Math.round((sprite==='sparkleLarge'?40:sprite==='sparkleMedium'?26:18)*scale)
    };
  });
}

/** Choice shown when the field has no hops and no tools left. */
export function stuckChoice({undoAvailable=false,hearts}){
  const lives=hearts?.count??0;
  if(lives<=0){
    return {
      canRestart:false,
      canUndo:!!undoAvailable,
      title:'No hops left',
      body:undoAvailable
        ?'Undo a move, or wait for a life and play this field again.'
        :'Wait for a life, then lose it to play this field again.'
    };
  }
  return {
    canRestart:true,
    canUndo:!!undoAvailable,
    title:'No hops left',
    body:undoAvailable
      ?'Lose a life to play this field again, or undo a move.'
      :'Lose a life to play this field again.'
  };
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
  if(hint.outcome==='none')return 'No winning route from here. Undo, or lose a life to restart.';
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

/** Every cell is the same honey comb. A landing is that comb with a green wash. */
export function hexTile({
  pollen=false,hive=false,
  tool=false,mode=null,settledBee=false,worker=false
}){
  const tile='hexHoney';
  let mark=null;
  if(settledBee)mark=worker?'beeWorker':'bee';
  else if(tool&&mode==='seed')mark='mango';
  else if(pollen)mark='flower';
  else if(hive)mark='crown';
  return {tile,mark};
}

export function boardNote({status,hint,mode,filtered,level,round,jumpCount=null,otherJumps=0,undoAvailable=true}){
  if(status==='won')return 'Every flower is in the jar.';
  if(hint)return hintCopy(hint);
  if(mode==='tunnel')return 'Tap a glowing hex to burrow. It collects nothing.';
  if(mode==='seed')return 'Tap an empty hex to plant a flower you must collect.';
  if(mode==='summon')return 'Tap the hive to call a worker bee.';
  if(status==='stuck')return undoAvailable
    ?'No jumps or tools left. Lose a life to play again, or undo.'
    :'No jumps or tools left. Lose a life to play again.';
  if(jumpCount===0){
    if(otherJumps>0)return 'This bee has no hop. Tap the other bee.';
    const charges=round.charges||{};
    const giveUp=undoAvailable?'undo':'lose a life to play again';
    if(charges.seed>0)return `No hops from here. Plant a flower, or ${giveUp}.`;
    if(charges.tunnel>0)return `No hops from here. Burrow, or ${giveUp}.`;
    if(charges.worker>0)return `No hops from here. Call a worker, or ${giveUp}.`;
    return undoAvailable?'No hops from here. Undo, or lose a life to play again.':'No hops from here. Lose a life to play again.';
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
