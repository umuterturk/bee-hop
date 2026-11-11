import test from 'node:test';
import assert from 'node:assert/strict';
import {hexDistance,legalJumps,seedTargets,solveAbilities,statusOf,step,summonTargets,tunnelTargets} from '../src/engine/abilities.js';
import {findHint} from '../src/session/hint.js';

const emptyCharges={tunnel:0,seed:0,worker:0};
function board(extra){return {width:5,height:1,bees:[0],pollen:[2],charges:{...emptyCharges},hives:[],blocked:[],...extra};}

test('axial neighbors are distance 1',()=>{
  const at=2*5+2;
  for(const cell of [6,7,11,13,16,17])assert.equal(hexDistance(at,cell,5),1);
  assert.equal(hexDistance(0,3,5),3);
});
test('an illegal action returns the same state',()=>{
  const state=board();
  assert.equal(step(state,{type:'tunnel',bee:0,to:1}),state);
  assert.equal(step(state,{type:'seed',bee:0,to:1}),state);
  assert.equal(step(state,{type:'summon',hive:4}),state);
  assert.equal(step(state,{type:'jump',bee:0,over:1,to:2}),state);
});
test('a second bee blocks the landing behind it',()=>{
  const state=board({bees:[0,4],pollen:[2]});
  const landings=legalJumps(state).filter(move=>move.bee===0).map(move=>move.to);
  assert.deepEqual(landings,[3]);
  assert.equal(step(state,{type:'jump',bee:0,over:2,to:4}),state);
});
test('tunnel, seed, and summon change only what they claim',()=>{
  const state=board({charges:{tunnel:1,seed:1,worker:1},hives:[4]});
  assert.equal(hexDistance(0,4,5),4);
  assert.ok(tunnelTargets(state,0).includes(3));
  assert.ok(!tunnelTargets(state,0).includes(4));
  const tunneled=step(state,{type:'tunnel',bee:0,to:1});
  assert.deepEqual(tunneled.bees,[1]);
  assert.equal(tunneled.charges.tunnel,0);
  assert.deepEqual(tunneled.pollen,[2]);
  const seeded=step(state,{type:'seed',bee:0,to:1});
  assert.deepEqual(seeded.pollen,[1,2]);
  assert.equal(seeded.charges.seed,0);
  assert.deepEqual(seedTargets(state,0).includes(4),hexDistance(0,4,5)<=2);
  const summoned=step(state,{type:'summon',hive:4});
  assert.deepEqual(summoned.bees,[0,4]);
  assert.equal(summoned.charges.worker,0);
  assert.equal(step(summoned,{type:'summon',hive:3}),summoned);
});
test('a stuck bee is not declared lost while a tunnel can still move it',()=>{
  const stuck={width:3,height:2,bees:[0],pollen:[4],charges:{...emptyCharges},hives:[],blocked:[]};
  assert.equal(statusOf(stuck),'stuck');
  const rescued={...stuck,charges:{tunnel:1,seed:0,worker:0}};
  assert.equal(statusOf(rescued),'playing');
  const solved=solveAbilities(rescued,{maxStates:1000});
  assert.equal(solved.solvable,true);
  assert.equal(solved.truncated,false);
  assert.equal(solved.actions[0].type,'tunnel');
  let state=rescued;
  for(const action of solved.actions)state=step(state,action);
  assert.equal(statusOf(state),'won');
  assert.equal(state.pollen.length,0);
});
test('hint promises a clear only from a finished route and treats a capped search as unknown',()=>{
  const rescued={width:3,height:2,bees:[0],pollen:[4],charges:{tunnel:1,seed:0,worker:0},hives:[],blocked:[]};
  const hint=findHint(rescued,{abilityStates:1000});
  assert.equal(hint.outcome,'win');
  assert.equal(hint.steps[0].type,'tunnel');
  assert.equal(findHint({...rescued,charges:{tunnel:0,seed:0,worker:0}}).outcome,'none');
  assert.equal(findHint(rescued,{abilityStates:0}).outcome,'unknown');
});
test('seeded pollen counts toward the clear',()=>{
  const state=board({width:4,height:1,bees:[0],pollen:[],charges:{tunnel:0,seed:1,worker:0}});
  const planted=step(state,{type:'seed',bee:0,to:2});
  assert.equal(statusOf(planted),'playing');
  const cleared=step(planted,{type:'jump',bee:0,over:2,to:3});
  assert.equal(statusOf(cleared),'won');
});
