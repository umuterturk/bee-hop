import test from 'node:test';
import assert from 'node:assert/strict';
import {HEART_CAP,HEART_REFILL_MS,applyLifeRestart,attemptLocked,freshHearts,grantHeart,heartWait,refillHearts,spendHeart} from '../src/session/hearts.js';
import {loadProgress,memoryStorage,saveProgress,PROGRESS_KEY} from '../src/session/progress.js';
import {newRound} from '../src/session/round.js';
import {LEVELS} from '../src/content/catalog.js';

const start=1_700_000_000_000;
const minute=60*1000;

test('a new player has three hearts and no refill timer',()=>{
  assert.equal(HEART_CAP,3);
  assert.deepEqual(HEART_REFILL_MS,[5*minute,15*minute,20*minute]);
  assert.deepEqual(freshHearts(),{count:3,nextAt:null});
});
test('the first heart refills in five minutes, the second in fifteen, and the third in twenty',()=>{
  const one=spendHeart(freshHearts(),start);
  assert.deepEqual(one,{count:2,nextAt:start+5*minute,step:0});
  assert.equal(heartWait(one,start),'5:00');
  const two=spendHeart(one,start+minute);
  assert.deepEqual(two,{count:1,nextAt:start+5*minute,step:0});
  const empty=spendHeart(two,start+minute);
  assert.deepEqual(empty,{count:0,nextAt:start+5*minute,step:0});
  assert.deepEqual(spendHeart(empty,start),empty);
  const first=refillHearts(empty,start+5*minute);
  assert.deepEqual(first,{count:1,nextAt:start+20*minute,step:1});
  assert.equal(heartWait(first,start+5*minute),'15:00');
  const second=refillHearts(first,start+20*minute);
  assert.deepEqual(second,{count:2,nextAt:start+40*minute,step:2});
  assert.equal(heartWait(second,start+20*minute),'20:00');
  assert.deepEqual(refillHearts(second,start+40*minute),freshHearts());
  assert.deepEqual(refillHearts(empty,start+40*minute),freshHearts());
  assert.equal(heartWait(freshHearts(),start),'');
});
test('losing another heart does not push a running refill later',()=>{
  const waiting=spendHeart(freshHearts(),start);
  const again=spendHeart(waiting,start+minute);
  assert.equal(again.nextAt,waiting.nextAt);
  assert.equal(again.step,0);
});
test('a saved thirty minute timer is shortened to the new schedule',()=>{
  assert.deepEqual(refillHearts({count:2,nextAt:start+30*minute},start),{count:2,nextAt:start+5*minute,step:0});
  assert.deepEqual(refillHearts({count:1,nextAt:start+30*minute,step:1},start),{count:1,nextAt:start+15*minute,step:1});
  assert.deepEqual(refillHearts({count:0,nextAt:start+30*minute,step:2},start),{count:0,nextAt:start+20*minute,step:2});
});
test('a new life adds one heart and stops the timer when the bank is full',()=>{
  const waiting={count:0,nextAt:start+5*minute,step:0};
  assert.deepEqual(grantHeart(waiting,start),{count:1,nextAt:start+5*minute,step:0});
  assert.deepEqual(grantHeart({count:2,nextAt:start+5*minute,step:0},start),freshHearts());
  assert.deepEqual(grantHeart(freshHearts(),start),freshHearts());
  assert.deepEqual(grantHeart({count:1,nextAt:start+20*minute,step:1},start+5*minute),{count:2,nextAt:start+20*minute,step:1});
  assert.deepEqual(grantHeart({count:0,nextAt:start,step:0},start+5*minute),{count:2,nextAt:start+15*minute,step:1});
});
test('a stuck attempt can spend its last life and the replay stays playable',()=>{
  const round={turns:3,usedUndo:false,usedTool:false,past:[1],failedHeart:false};
  const last=spendHeart(spendHeart(freshHearts(),start),start);
  assert.equal(last.count,1);
  const result=applyLifeRestart(last,round,'stuck',start);
  assert.equal(result.ok,true);
  assert.equal(result.spendsLife,true);
  assert.equal(result.lifePaid,true);
  assert.equal(result.hearts.count,0);
  assert.equal(attemptLocked(result.hearts,{lifePaid:true}),false);
  assert.equal(attemptLocked(result.hearts,{lifePaid:false}),true);
});
test('no life left refuses a restart, and a fresh or finished field is free',()=>{
  const touched={turns:2,usedUndo:false,usedTool:false,past:[1],failedHeart:false};
  const empty={count:0,nextAt:start+5*minute,step:0};
  const blocked=applyLifeRestart(empty,touched,'stuck',start);
  assert.equal(blocked.ok,false);
  assert.equal(blocked.hearts.count,0);
  const fresh=applyLifeRestart(freshHearts(),{turns:0,usedUndo:false,usedTool:false,past:[]},'playing',start);
  assert.equal(fresh.ok,true);
  assert.equal(fresh.spendsLife,false);
  assert.equal(fresh.hearts.count,3);
  const won=applyLifeRestart({count:1,nextAt:start+15*minute,step:1},touched,'won',start);
  assert.equal(won.ok,true);
  assert.equal(won.spendsLife,false);
  assert.equal(won.hearts.count,1);
  const already=applyLifeRestart({count:2,nextAt:start+5*minute,step:0},{...touched,failedHeart:true},'stuck',start);
  assert.equal(already.ok,true);
  assert.equal(already.spendsLife,false);
  assert.equal(already.hearts.count,2);
});
test('saved progress keeps a partial heart bank and old saves start full',()=>{
  const storage=memoryStorage();
  const soon=Date.now()+15*minute;
  const progress={v:1,unlocked:1,badges:{},settings:{sound:true,music:false,haptics:true,reduceMotion:false},resume:null,hearts:{count:1,nextAt:soon,step:1}};
  saveProgress(progress,storage);
  assert.deepEqual(loadProgress(storage).hearts,{count:1,nextAt:soon,step:1});
  storage.setItem(PROGRESS_KEY,JSON.stringify({v:1,unlocked:2,badges:{},settings:{},resume:null}));
  assert.deepEqual(loadProgress(storage).hearts,{count:3,nextAt:null});
  storage.setItem(PROGRESS_KEY,JSON.stringify({...progress,hearts:{count:0,nextAt:start}}));
  assert.deepEqual(loadProgress(storage).hearts,{count:3,nextAt:null});
  const round=newRound(LEVELS[0]);
  saveProgress({...progress,unlocked:1,resume:{levelId:1,round:{...round,failedHeart:true}},hearts:{count:2,nextAt:soon,step:0}},storage);
  assert.equal(loadProgress(storage).resume.round.failedHeart,true);
});
