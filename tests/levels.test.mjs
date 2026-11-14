import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTIONS,LEVELS,LEVEL_SPECS,WAVE_NAMES,legalMoves,playMove,
  selectableMoves,solvePuzzle,stepHex,verifyPath,evaluatePuzzle,generatePuzzle,
  difficultyWave,pollenFor,targetFor,bossFor} from '../src/content/catalog.js';
import {legalJumps,statusOf as boardStatus} from '../src/engine/abilities.js';
import {commit,newRound,toBoard} from '../src/session/round.js';

function brutePaths(initial){
  if(!initial.pollen.length)return {total:1n,wins:1n};
  const moves=legalMoves(initial);
  if(!moves.length)return {total:1n,wins:0n};
  let total=0n,wins=0n;
  for(const move of moves){const child=brutePaths(playMove(initial,move));total+=child.total;wins+=child.wins;}
  return {total,wins};
}
test('hex steps visit six different neighbors and reverse correctly',()=>{
  assert.equal(DIRECTIONS.length,6);
  const at=2*5+2,neighbors=DIRECTIONS.map(dir=>stepHex(at,dir,5,5));
  assert.equal(new Set(neighbors).size,6);
  assert.deepEqual(neighbors.sort((a,b)=>a-b),[6,7,11,13,16,17]);
  for(const dir of DIRECTIONS)assert.equal(stepHex(stepHex(at,dir,5,5),[-dir[0],-dir[1]],5,5),at);
});
test('landings are directly playable without requesting hints',()=>{
  const state={width:5,height:5,bee:0,pollen:[1,5,6]};
  const moves=legalMoves(state);
  assert.equal(moves.length,6);
  assert.deepEqual(selectableMoves(moves),moves);
  assert.equal(selectableMoves(moves,1).length,3);
  const next=playMove(state,selectableMoves(moves)[0]);
  assert.equal(next.pollen.length,2);
  assert.deepEqual(selectableMoves(moves,null),moves);
});
test('meaningful branching excludes immediate dead ends (6 landings -> 2 continue)',()=>{
  const state={width:5,height:5,bee:0,pollen:[1,5,6]};
  const metrics=evaluatePuzzle(state);
  assert.equal(metrics.exact,true);
  assert.equal(metrics.legalFirst,6);
  assert.equal(metrics.continuingFirst,2);
  assert.equal(metrics.winningFirst,2);
  assert.equal(metrics.totalPaths,'8');
  assert.equal(metrics.realPaths,'2');
  assert.equal(metrics.winningPaths,'2');
});
test('exact winning and total path counts match independent brute force',()=>{
  const fixtures=[
    {width:5,height:1,bee:0,pollen:[2]},
    {width:5,height:5,bee:0,pollen:[1,5,6]},
    {width:4,height:4,bee:1,pollen:[4,6,7]},
    {width:3,height:3,bee:0,pollen:[8]}
  ];
  for(const state of fixtures){
    const brute=brutePaths(state),stats=evaluatePuzzle(state);
    assert.ok(stats.exact);
    assert.equal(stats.totalPaths,brute.total.toString());
    assert.equal(stats.winningPaths,brute.wins.toString());
  }
});
test('all 40 published levels have a valid full solution and exact metrics',()=>{
  assert.equal(LEVELS.length,40);
  assert.equal(LEVEL_SPECS.length,40);
  assert.equal(WAVE_NAMES.length,8);
  for(let i=0;i<40;i++){
    const level=LEVELS[i],spec=LEVEL_SPECS[i];
    assert.equal(level.id,i+1);
    for(const key of ['width','height','pollen']){
      if(key==='pollen')assert.equal(level.pollen.length,spec.pollen);
      else assert.equal(level[key],spec[key]);
    }
    assert.equal(level.boss,spec.boss);
    assert.equal(level.wave,Math.floor(i/5));
    assert.equal(new Set(level.pollen).size,level.pollen.length);
    assert.ok(!level.pollen.includes(level.bee));
    assert.ok(level.pollen.every(cell=>cell>=0&&cell<level.width*level.height));
    assert.ok(legalMoves(level).length>0);
    const solved=solvePuzzle(level,{maxStates:150000});
    assert.ok(solved.solvable&&!solved.truncated,`Level ${level.id} not solvable`);
    assert.equal(solved.moves.length,level.pollen.length);
    assert.ok(verifyPath(level,solved.moves));
    const exact=evaluatePuzzle(level,{maxStates:200000});
    assert.ok(exact.exact,`Level ${level.id} exceeded exact state budget`);
    assert.deepEqual(exact,level.metrics,`Level ${level.id} metrics drifted`);
    let round=newRound(level);
    for(const move of solved.moves){
      const next=commit(round,{type:'jump',bee:move.from,over:move.over,to:move.to});
      assert.notEqual(next,round,`Level ${level.id} rejected a certified jump`);
      round=next;
    }
    assert.equal(boardStatus(toBoard(round)),'won');
    assert.equal(round.usedTool,false);
    if(i>0&&i<5)assert.ok(level.metrics.difficulty>LEVELS[i-1].metrics.difficulty,
      `Onboarding difficulty did not rise between ${i} and ${i+1}`);
  }
});
test('after onboarding the meadow is 8x8, fuller, and bosses land every 20 rounds',()=>{
  assert.deepEqual([LEVELS[0].width,LEVELS[0].height],[3,3]);
  assert.ok(LEVELS.slice(1,5).every(level=>level.width===4&&level.height===4));
  assert.ok(LEVELS.slice(0,5).every(level=>!level.boss));
  const meadow=LEVELS.slice(5);
  assert.ok(meadow.every(level=>level.width===8&&level.height===8));
  assert.deepEqual(LEVELS.filter(level=>level.boss).map(level=>level.id),[20,40]);
  assert.ok(meadow.every(level=>level.pollen.length>=6&&level.pollen.length<=14));
  assert.ok(LEVELS[19].pollen.length>LEVELS[9].pollen.length);
  assert.ok(LEVELS[19].pollen.length>LEVELS[29].pollen.length);
  assert.ok(LEVELS[39].pollen.length>LEVELS[29].pollen.length);
});
test('meadow difficulty follows a sine and comes back down between bosses',()=>{
  assert.equal(difficultyWave(10),0);
  assert.equal(difficultyWave(20),1);
  assert.equal(difficultyWave(30),0);
  assert.equal(difficultyWave(40),1);
  assert.ok(Math.abs(difficultyWave(15)-0.5)<1e-12);
  assert.ok(difficultyWave(25)<difficultyWave(20));
  assert.ok(difficultyWave(35)>difficultyWave(30));
  for(const spec of LEVEL_SPECS){
    assert.equal(spec.pollen,pollenFor(spec.id));
    assert.equal(spec.target,targetFor(spec.id));
    assert.equal(spec.boss,bossFor(spec.id));
    if(spec.boss)assert.match(spec.name,/Boss/);
    else assert.doesNotMatch(spec.name,/Boss/);
  }
  const d=id=>LEVELS[id-1].metrics.difficulty;
  for(const spec of LEVEL_SPECS){
    if(spec.id<=5)continue;
    assert.ok(Math.abs(d(spec.id)-spec.target)<=1.5,
      `Level ${spec.id} difficulty ${d(spec.id)} left the sine target ${spec.target}`);
  }
  assert.ok(d(20)>d(10)+2,`crest ${d(20)} should clear the valley ${d(10)}`);
  assert.ok(d(30)<d(20)-2,`level 30 (${d(30)}) should fall back after the boss (${d(20)})`);
  assert.ok(d(40)>d(30)+2,`final boss ${d(40)} should rise out of the valley ${d(30)}`);
  assert.ok(d(25)<d(20)&&d(25)>d(30));
  assert.ok(d(19)<d(20)&&d(21)<d(20),`boss 20 should be the local crest (${d(19)}, ${d(20)}, ${d(21)})`);
  assert.ok(d(39)<d(40),`boss 40 should rise above ${d(39)}`);
});
test('one bee jumps match the reference rules on every published field',()=>{
  for(const level of LEVELS){
    const round=newRound(level,{undo:null,dance:null,tunnel:0,seed:0,worker:0});
    const jumps=legalJumps(toBoard(round)).map(({bee,over,to})=>({from:bee,over,to}));
    assert.deepEqual(jumps,legalMoves(level));
  }
});
test('generator deterministically constructs and verifies an unscripted puzzle',()=>{
  const spec=LEVEL_SPECS[2];
  const a=generatePuzzle(spec,{candidates:40});
  const b=generatePuzzle(spec,{candidates:40});
  assert.deepEqual(a,b);
  assert.ok(verifyPath(a,a.witness));
  assert.ok(verifyPath(a,a.solution));
  assert.ok(a.metrics.exact);
});
