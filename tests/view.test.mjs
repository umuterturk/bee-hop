import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/content/catalog.js';
import {legalJumps,statusOf} from '../src/engine/abilities.js';
import {boardNote,boosterCallout,hexTile} from '../src/view/presentation.js';

test('playing with no landings never asks for a green hex',()=>{
  const round={turns:4,usedUndo:false,bees:[32],pollen:[20],charges:{tunnel:0,seed:1,worker:0},past:[1]};
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[24],round,
    jumpCount:0
  });
  assert.doesNotMatch(note,/green hex/i);
  assert.match(note,/No hops/i);
  assert.match(note,/Plant a flower|booster|undo/i);
});

test('playing with landings still points at a green hex',()=>{
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[0],
    round:{turns:1,usedUndo:false,bees:[0],pollen:[1]},jumpCount:3
  });
  assert.match(note,/green hex/i);
});

test('a seed charge is the callout when the bee has no hop',()=>{
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:0,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),'seed');
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:4,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),null);
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:0,otherJumps:2,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),null);
});

test('a selected bee with no hops points at the other bee',()=>{
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[25],
    round:{turns:2,usedUndo:false,bees:[0,10],pollen:[1],charges:{tunnel:0,seed:1,worker:0}},
    jumpCount:0,otherJumps:3
  });
  assert.match(note,/other bee/);
  assert.doesNotMatch(note,/green hex|Plant a flower/i);
});

test('every cell shares the honey hex, with a blossom or a stone on top',()=>{
  const empty=hexTile({});
  assert.equal(empty.tile,'hexHoney');
  assert.equal(empty.mark,null);
  const live=hexTile({landing:true,dead:false});
  assert.equal(live.tile,'hexHoney');
  assert.equal(live.mark,null);
  const flower=hexTile({pollen:true});
  assert.equal(flower.tile,empty.tile);
  assert.equal(flower.mark,'flower');
  const trap=hexTile({landing:true,dead:true});
  assert.equal(trap.tile,empty.tile);
  assert.equal(trap.mark,'stoneMoss');
  const bee=hexTile({settledBee:true,worker:false});
  assert.equal(bee.tile,empty.tile);
  assert.equal(bee.mark,'bee');
});

test('the screenshot board (last flower, bee off-line) is still playing with zero hops',()=>{
  const board={width:8,height:7,bees:[32],pollen:[20],charges:{tunnel:0,seed:1,worker:0},hives:[],blocked:[]};
  assert.equal(legalJumps(board).length,0);
  assert.equal(statusOf(board),'playing');
});
