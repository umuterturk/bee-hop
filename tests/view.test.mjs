import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS} from '../src/content/catalog.js';
import {legalJumps,statusOf} from '../src/engine/abilities.js';
import {boardNote,boosterCallout,collectBurst,hexTile,stuckChoice} from '../src/view/presentation.js';

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

test('honey cells stay honey, and a landing is the same comb with a green wash',()=>{
  const empty=hexTile({});
  assert.equal(empty.tile,'hexHoney');
  assert.equal(empty.mark,null);
  const live=hexTile({landing:true});
  assert.equal(live.tile,'hexHoney');
  assert.equal(live.mark,null);
  const trap=hexTile({landing:true,dead:true});
  assert.equal(trap.tile,'hexHoney');
  assert.equal(trap.mark,null);
  const flower=hexTile({pollen:true});
  assert.equal(flower.tile,'hexHoney');
  assert.equal(flower.mark,'flower');
  const bee=hexTile({settledBee:true,worker:false});
  assert.equal(bee.tile,'hexHoney');
  assert.equal(bee.mark,'bee');
});

test('unplayable cells stay full honey and landings use a soft green wash',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/has-landings[\s\S]{0,220}brightness/);
  assert.doesNotMatch(css,/\.hop-cell\.is-dead\{[^}]*grayscale/);
  assert.doesNotMatch(css,/saturate\(1\.35\)/);
  assert.match(css,/\.hop-cell\.is-landing::after\{[^}]*mix-blend-mode:\s*color/);
  const bee=css.match(/\.hop-mark\.is-bee,\.hop-mark\.is-beeWorker\{[^}]*z-index:\s*(\d+)/);
  const ring=css.match(/\.hop-ring\{[^}]*z-index:\s*(\d+)/);
  assert.ok(bee&&ring);
  assert.ok(Number(bee[1])>Number(ring[1]));
});

test('restart sits under the field with undo and hint',()=>{
  const source=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  const dock=source.slice(source.indexOf('aria-label="Boosters"'),source.indexOf('hop-sheet-backdrop'));
  assert.match(dock,/buttonRestart/);
  assert.match(dock,/Restart/);
});

test('a stuck field lets the player spend a life, including the last one',()=>{
  const choice=stuckChoice({undoAvailable:false,hearts:{count:1}});
  assert.equal(choice.canRestart,true);
  assert.equal(choice.canUndo,false);
  assert.match(choice.body,/life/i);
  const withUndo=stuckChoice({undoAvailable:true,hearts:{count:3}});
  assert.equal(withUndo.canRestart,true);
  assert.equal(withUndo.canUndo,true);
  assert.match(withUndo.body,/undo/i);
  const waiting=stuckChoice({undoAvailable:false,hearts:{count:0}});
  assert.equal(waiting.canRestart,false);
  assert.match(waiting.body,/life/i);
});

test('a stuck board spends a life only when the player chooses to restart',()=>{
  const source=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  assert.match(source,/applyLifeRestart/);
  assert.match(source,/Lose a life/);
  assert.doesNotMatch(source,/status!=='stuck'[\s\S]{0,220}spendHeart/);
});

test('collecting a flower plans a sparkle burst',()=>{
  const burst=collectBurst();
  assert.ok(burst.length>=6);
  assert.ok(burst.every(bit=>bit.sprite.startsWith('sparkle')));
  const places=new Set(burst.map(bit=>`${bit.dx},${bit.dy}`));
  assert.equal(places.size,burst.length);
  const board=readFileSync(new URL('../src/view/Board.jsx',import.meta.url),'utf8');
  assert.match(board,/collectBurst/);
  assert.match(board,/picked/);
  const ring=board.indexOf('ringDashed');
  const mark=board.indexOf('hop-mark is-');
  assert.ok(ring!==-1&&mark!==-1&&ring<mark);
});

test('the screenshot board (last flower, bee off-line) is still playing with zero hops',()=>{
  const board={width:8,height:7,bees:[32],pollen:[20],charges:{tunnel:0,seed:1,worker:0},hives:[],blocked:[]};
  assert.equal(legalJumps(board).length,0);
  assert.equal(statusOf(board),'playing');
});
