import test from 'node:test';
import assert from 'node:assert/strict';
import {HEART_CAP,HEART_REFILL_MS,freshHearts,grantHeart,refillHearts,spendHeart} from '../src/session/hearts.js';
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
