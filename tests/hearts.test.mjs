import test from 'node:test';
import assert from 'node:assert/strict';
import {HEART_CAP,HEART_REFILL_MS,applyLifeRestart,attemptLocked,freshHearts,grantHeart,refillHearts,spendHeart} from '../src/session/hearts.js';
import {loadProgress,memoryStorage,saveProgress,PROGRESS_KEY} from '../src/session/progress.js';
import {newRound} from '../src/session/round.js';
import {LEVELS} from '../src/content/catalog.js';

const start=1_700_000_000_000;

test('a new player has three hearts and no refill timer',()=>{
  assert.equal(HEART_CAP,3);
  assert.equal(HEART_REFILL_MS,30*60*1000);
  assert.deepEqual(freshHearts(),{count:3,nextAt:null});
});
test('losing a heart starts a thirty minute refill without resetting a running timer',()=>{
  const waiting=spendHeart(freshHearts(),start);
  assert.deepEqual(waiting,{count:2,nextAt:start+HEART_REFILL_MS});
  const again=spendHeart(waiting,start+5*60*1000);
  assert.deepEqual(again,{count:1,nextAt:start+HEART_REFILL_MS});
  assert.deepEqual(spendHeart({count:0,nextAt:start+HEART_REFILL_MS},start),{count:0,nextAt:start+HEART_REFILL_MS});
});
test('a new life adds one heart and stops the timer when the bank is full',()=>{
  assert.deepEqual(grantHeart({count:0,nextAt:start+HEART_REFILL_MS},start),{count:1,nextAt:start+HEART_REFILL_MS});
  assert.deepEqual(grantHeart({count:2,nextAt:start+HEART_REFILL_MS},start),freshHearts());
  assert.deepEqual(grantHeart(freshHearts(),start),freshHearts());
  assert.deepEqual(grantHeart({count:1,nextAt:start+HEART_REFILL_MS},start),{count:2,nextAt:start+HEART_REFILL_MS});
  assert.deepEqual(grantHeart({count:0,nextAt:start},start+HEART_REFILL_MS),freshHearts());
});
test('hearts refill one at a time until the bank is full',()=>{
  const empty={count:0,nextAt:start+HEART_REFILL_MS};
  assert.deepEqual(refillHearts(empty,start+HEART_REFILL_MS),{count:1,nextAt:start+2*HEART_REFILL_MS});
  assert.deepEqual(refillHearts(empty,start+3*HEART_REFILL_MS),{count:3,nextAt:null});
  assert.deepEqual(refillHearts({count:3,nextAt:start},start+HEART_REFILL_MS),{count:3,nextAt:null});
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
  const empty={count:0,nextAt:start+HEART_REFILL_MS};
  const blocked=applyLifeRestart(empty,touched,'stuck',start);
  assert.equal(blocked.ok,false);
  assert.equal(blocked.hearts.count,0);
  const fresh=applyLifeRestart(freshHearts(),{turns:0,usedUndo:false,usedTool:false,past:[]},'playing',start);
  assert.equal(fresh.ok,true);
  assert.equal(fresh.spendsLife,false);
  assert.equal(fresh.hearts.count,3);
  const won=applyLifeRestart({count:1,nextAt:start+HEART_REFILL_MS},touched,'won',start);
  assert.equal(won.ok,true);
  assert.equal(won.spendsLife,false);
  assert.equal(won.hearts.count,1);
  const already=applyLifeRestart({count:2,nextAt:start+HEART_REFILL_MS},{...touched,failedHeart:true},'stuck',start);
  assert.equal(already.ok,true);
  assert.equal(already.spendsLife,false);
  assert.equal(already.hearts.count,2);
});
test('saved progress keeps a partial heart bank and old saves start full',()=>{
  const storage=memoryStorage();
  const soon=Date.now()+HEART_REFILL_MS;
  const progress={v:1,unlocked:1,badges:{},settings:{sound:true,music:false,haptics:true,reduceMotion:false},resume:null,hearts:{count:1,nextAt:soon}};
  saveProgress(progress,storage);
  assert.deepEqual(loadProgress(storage).hearts,{count:1,nextAt:soon});
  storage.setItem(PROGRESS_KEY,JSON.stringify({v:1,unlocked:2,badges:{},settings:{},resume:null}));
  assert.deepEqual(loadProgress(storage).hearts,{count:3,nextAt:null});
  storage.setItem(PROGRESS_KEY,JSON.stringify({...progress,hearts:{count:0,nextAt:start}}));
  assert.deepEqual(loadProgress(storage).hearts,{count:3,nextAt:null});
  const round=newRound(LEVELS[0]);
  saveProgress({...progress,unlocked:1,resume:{levelId:1,round:{...round,failedHeart:true}},hearts:{count:2,nextAt:soon}},storage);
  assert.equal(loadProgress(storage).resume.round.failedHeart,true);
});
