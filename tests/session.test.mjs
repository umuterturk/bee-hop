import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/content/catalog.js';
import {hiveCell,inventoryFor} from '../src/content/campaign.js';
import {legalJumps,seedTargets} from '../src/engine/abilities.js';
import {commit,newRound,toBoard,undo} from '../src/session/round.js';
import {loadProgress,memoryStorage,saveProgress,PROGRESS_KEY} from '../src/session/progress.js';
import {boardNote,earnedBadges,hintCopy,jarFill} from '../src/view/presentation.js';

test('tool grants follow the wave table and never show more than three tools',()=>{
  assert.deepEqual(inventoryFor(LEVELS[0]),{undo:null,dance:null,tunnel:0,seed:0,worker:0});
  assert.equal(inventoryFor(LEVELS[4]).undo,null);
  assert.equal(inventoryFor(LEVELS[5]).undo,3);
  assert.equal(inventoryFor(LEVELS[5]).dance,null);
  assert.equal(inventoryFor(LEVELS[10]).dance,2);
  assert.equal(inventoryFor(LEVELS[15]).tunnel,1);
  assert.equal(inventoryFor(LEVELS[15]).seed,0);
  assert.equal(inventoryFor(LEVELS[20]).seed,1);
  assert.equal(inventoryFor(LEVELS[20]).tunnel,0);
  assert.equal(inventoryFor(LEVELS[24]).seed,1);
  assert.equal(inventoryFor(LEVELS[25]).worker,1);
  assert.equal(inventoryFor(LEVELS[25]).seed,1);
  assert.equal(inventoryFor(LEVELS[29]).seed,1);
  assert.equal(inventoryFor(LEVELS[30]).tunnel,1);
  assert.equal(inventoryFor(LEVELS[30]).seed,1);
  assert.equal(inventoryFor(LEVELS[30]).worker,0);
  const finale=inventoryFor(LEVELS[35]);
  assert.deepEqual([finale.tunnel,finale.seed,finale.worker],[1,1,1]);
  for(const level of LEVELS){
    const grant=inventoryFor(level);
    assert.ok(grant.tunnel+grant.seed+grant.worker<=3);
    if(grant.worker){
      const hive=hiveCell(level);
      assert.ok(hive>=0);
      assert.ok(hive!==level.bee&&!level.pollen.includes(hive));
    }
  }
});
test('undo spends a rewind charge and does not refund it',()=>{
  const round=newRound(LEVELS[5]);
  assert.equal(round.undoLeft,3);
  const jump=legalJumps(toBoard(round))[0];
  const played=commit(round,jump);
  const rewound=undo(played);
  assert.equal(rewound.undoLeft,2);
  assert.equal(rewound.usedUndo,true);
  assert.deepEqual(rewound.bees,round.bees);
  assert.deepEqual(rewound.pollen,round.pollen);
  assert.equal(rewound.turns,0);
  const second=commit(rewound,legalJumps(toBoard(rewound))[0]);
  assert.equal(undo(second).undoLeft,1);
});
test('seed and its goal rewind together, while the rewind charge stays spent',()=>{
  const level=LEVELS[20];
  const round=newRound(level);
  assert.equal(round.charges.seed,1);
  const cell=seedTargets(toBoard(round),round.bees[0])[0];
  assert.equal(Number.isInteger(cell),true);
  const planted=commit(round,{type:'seed',bee:round.bees[0],to:cell});
  assert.equal(planted.goal,round.goal+1);
  assert.ok(planted.pollen.includes(cell));
  assert.equal(planted.usedTool,true);
  const rewound=undo(planted);
  assert.equal(rewound.charges.seed,1);
  assert.equal(rewound.goal,round.goal);
  assert.equal(rewound.usedTool,false);
  assert.equal(rewound.undoLeft,2);
  assert.equal(jarFill(planted)>jarFill(round),false);
});
test('badges credit a clean route and a boss, and hint copy does not call a mere continuation safe',()=>{
  const round={usedTool:false,usedUndo:false,goal:2,pollen:[1]};
  assert.deepEqual(earnedBadges(round,{boss:false}).map(badge=>badge.name),['Pure Flight','Clean Wings']);
  assert.ok(earnedBadges({...round,usedUndo:true},{boss:true}).some(badge=>badge.name==='Hive Master'));
  assert.equal(earnedBadges({...round,usedTool:true},{boss:false}).some(badge=>badge.id==='pure'),false);
  const copy=hintCopy({outcome:'win',layer:0,steps:[{type:'jump',bee:0,over:1,to:2}]});
  assert.match(copy,/clears the field/);
  assert.doesNotMatch(copy,/next move/);
  assert.match(boardNote({status:'stuck',hint:null,mode:null,filtered:false,level:LEVELS[0],round:{turns:1,usedUndo:false,bees:[0]}}),/Lose a life/);
});
test('progress ignores corrupt saves and keeps a valid resume',()=>{
  const storage=memoryStorage();
  storage.setItem(PROGRESS_KEY,'{');
  assert.equal(loadProgress(storage).unlocked,1);
  const round=newRound(LEVELS[0]);
  const progress={v:1,unlocked:1,badges:{1:['pure']},settings:{sound:false,music:false,haptics:true,reduceMotion:false},resume:{levelId:1,round}};
  saveProgress(progress,storage);
  const loaded=loadProgress(storage);
  assert.equal(loaded.unlocked,1);
  assert.deepEqual(loaded.resume.round.bees,round.bees);
  assert.equal(loaded.settings.sound,false);
  storage.setItem(PROGRESS_KEY,JSON.stringify({...progress,resume:{levelId:1,round:{bee:1}}}));
  assert.equal(loadProgress(storage).resume,null);
});
